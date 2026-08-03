import type { ActionContextVariablesFlatten, ActionVariable, SummaryActionContextVariablesFlatten } from '@kbn/alerting-types';
export declare enum AlertProvidedActionVariables {
    ruleId = "rule.id",
    ruleName = "rule.name",
    ruleSpaceId = "rule.spaceId",
    ruleTags = "rule.tags",
    ruleType = "rule.type",
    ruleUrl = "rule.url",
    ruleParams = "rule.params",
    date = "date",
    alertId = "alert.id",
    alertUuid = "alert.uuid",
    alertActionGroup = "alert.actionGroup",
    alertActionGroupName = "alert.actionGroupName",
    alertActionSubgroup = "alert.actionSubgroup",
    alertFlapping = "alert.flapping",
    kibanaBaseUrl = "kibanaBaseUrl",
    alertConsecutiveMatches = "alert.consecutiveMatches"
}
export declare enum LegacyAlertProvidedActionVariables {
    alertId = "alertId",
    alertName = "alertName",
    alertInstanceId = "alertInstanceId",
    alertActionGroup = "alertActionGroup",
    alertActionGroupName = "alertActionGroupName",
    alertActionSubgroup = "alertActionSubgroup",
    tags = "tags",
    spaceId = "spaceId",
    params = "params"
}
export declare enum SummaryAlertProvidedActionVariables {
    newAlertsCount = "alerts.new.count",
    newAlertsData = "alerts.new.data",
    ongoingAlertsCount = "alerts.ongoing.count",
    ongoingAlertsData = "alerts.ongoing.data",
    recoveredAlertsCount = "alerts.recovered.count",
    recoveredAlertsData = "alerts.recovered.data",
    allAlertsCount = "alerts.all.count",
    allAlertsData = "alerts.all.data"
}
type ActionVariablesWithoutName = Omit<ActionVariable, 'name'>;
export declare const AlertProvidedActionVariableDescriptions: Record<ActionContextVariablesFlatten, ActionVariablesWithoutName>;
export declare const SummarizedAlertProvidedActionVariableDescriptions: Record<SummaryActionContextVariablesFlatten, Omit<ActionVariable, 'name'>>;
export {};
