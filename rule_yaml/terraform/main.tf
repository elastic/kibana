terraform {
  required_providers {
    elasticstack = {
      source = "elastic/elasticstack"
    }
  }
}

provider "elasticstack" {
  kibana {
    endpoints = [var.kibana_endpoint]
    api_key   = var.kibana_api_key
  }
}

# Load the rule definitions from the YAML file and transform them.
locals {
  rules_data = yamldecode(file(var.rules_file_path))

  # Main map that restructures the YAML into a consistent format.
  rules_map = {
    for rule in local.rules_data.rules : rule.name => {
      name           = rule.name
      consumer       = try(rule.consumer, "alerts") # Default consumer to "alerts"
      rule_type_id   = rule.rule_type_id
      enabled        = rule.enabled
      notify_when    = try(rule.notify_when, "onActionGroupChange")
      tags           = rule.tags
      schedule       = rule.schedule
      lookbackWindow = rule.lookbackWindow
      timeField      = rule.timeField
      id             = rule.id
      # Merge top-level esql into the params block
      params = merge(
        rule.params,
        { esql = rule.esql }
      )
      # Carry over track block for filtering
      track = try(rule.track, {})
    }
  }

  # Filter for rules that have recovery enabled.
  recovery_rules_map = {
    for name, rule in local.rules_map : name => rule
    if try(rule.track.recovery.enabled, false) == true
  }

  # Filter for rules that have flapping enabled.
  flapping_rules_map = {
    for name, rule in local.rules_map : name => rule
    if try(rule.track.flapping.enabled, false) == true
  }
}

# Create the main rules.
resource "elasticstack_kibana_alerting_rule" "main_rules" {
  for_each = local.rules_map

  name         = "${each.value.name} (POC)"
  consumer     = each.value.consumer
  rule_type_id = each.value.rule_type_id
  enabled      = each.value.enabled
  notify_when  = each.value.notify_when
  tags         = each.value.tags
  interval     = each.value.schedule
  params       = jsonencode({
    esqlQuery = {
       esql = [
         for key in keys(each.value.params) :
          replace(each.value.params.esql, format("$${%s}", key), each.value.params[key])
        ][0]
    }
    timeField      = each.value.timeField
    timeWindowSize = tonumber(regex("(\\d+)(\\w+)", each.value.lookbackWindow)[0])
    timeWindowUnit = regex("(\\d+)(\\w+)", each.value.lookbackWindow)[1]
    parentId       = try(each.value.id, null)
  })
}

# Create the recovery rules if enabled.
resource "elasticstack_kibana_alerting_rule" "recovery_rules" {
  for_each = local.recovery_rules_map

  name         = "${each.value.name} - RECOVERY (POC)"
  consumer     = each.value.consumer
  rule_type_id = each.value.rule_type_id
  enabled      = each.value.enabled
  notify_when  = each.value.notify_when
  tags         = ["internal"]
  interval     = try(each.value.track.recovery.schedule, each.value.schedule)
  params = jsonencode({
    esqlQuery = {
      esql = replace(
        <<-EOT
          FROM kbn-data-forge-fake_stack.message_processor-*
          | STATS 
              failure = COUNT(*) WHERE processor.outcome == "failure",
              total = COUNT(*) 
            BY host.name
          | EVAL failure_rate = (failure * 100  / total)
          | WHERE failure_rate <= 50
          | RENAME host.name AS host_name
          | LOOKUP JOIN .internal.alerts-stack.alerts-default-000001 ON host_name == attrs.host.name
          | WHERE rule.parent_id == "esql-parent-id"
          | STATS @timestamp = MAX(@timestamp), status = LAST(status, @timestamp) BY rule.parent_id, attrs.host.name, failure_rate
          | WHERE status != "recovered"
          | RENAME attrs.host.name AS host_name
          | LOOKUP JOIN .internal.alerts-stack.alerts-default-000001
                  ON host_name == attrs.host.name
            | WHERE rule.id == "%%PARENT_RULE_ID%%"
            | STATS host.name = LAST(attrs.host.name, @timestamp) BY attrs.host.name, failure_rate
            | EVAL status = "recovered"
            | KEEP host.name, failure_rate, status
        EOT
        , "%%PARENT_RULE_ID%%", split("/", elasticstack_kibana_alerting_rule.main_rules[each.key].id)[1])
    },
    timeField      = each.value.timeField,
    timeWindowSize = tonumber(regex("(\\d+)(\\w+)", try(each.value.track.recovery.lookbackWindow, each.value.lookbackWindow))[0]),
    timeWindowUnit = regex("(\\d+)(\\w+)", try(each.value.track.recovery.lookbackWindow, each.value.lookbackWindow))[1],
    parentId       = try(each.value.id, null)
  })
}

# Create the flapping rules if enabled.
resource "elasticstack_kibana_alerting_rule" "flapping_rules" {
  for_each = local.flapping_rules_map

  name         = "${each.value.name} - FLAPPING (POC)"
  consumer     = each.value.consumer
  rule_type_id = each.value.rule_type_id
  enabled      = each.value.enabled
  notify_when  = each.value.notify_when
  tags         = ["internal"]
  interval     = try(each.value.track.flapping.schedule, "30m")
  params = jsonencode({
    esqlQuery = {
      esql = replace(
        replace(
          replace(
            <<-EOT
              FROM .internal.alerts-stack.alerts-default-*
              | WHERE rule.id == "%%RECOVERY_RULE_ID%%" AND @timestamp > NOW() - %%LOOKBACK%%
              | STATS recovery_count = COUNT(*) BY attrs.host.name
              | WHERE recovery_count > %%RECOVERY_COUNT%%
              | EVAL status = "flapping"
              | KEEP attrs.host.name, recovery_count, status
            EOT
            , "%%RECOVERY_RULE_ID%%", split("/", elasticstack_kibana_alerting_rule.recovery_rules[each.key].id)[1]
          ),
          "%%RECOVERY_COUNT%%",
          try(each.value.track.flapping.recovery_count, 2)
        ),
        "%%LOOKBACK%%",
        try(each.value.track.flapping.lookbackWindow, "15m")
      )
    },
    timeField      = each.value.timeField,
    timeWindowSize = tonumber(regex("(\\d+)(\\w+)", try(each.value.track.flapping.lookbackWindow, "15m"))[0]),
    timeWindowUnit = regex("(\\d+)(\\w+)", try(each.value.track.flapping.lookbackWindow, "15m"))[1],
    parentId       = try(each.value.id, null)
  })
}
