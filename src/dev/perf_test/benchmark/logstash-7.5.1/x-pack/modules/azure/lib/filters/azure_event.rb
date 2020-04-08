# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/filters/base"
require "logstash/namespace"
require "logstash/json"

module LogStash
  module Filters
    class AzureEvent < LogStash::Filters::Base

      config_name "azure_event"

      # When all heuristics fail to identify a category, this category will be used if and only if the default_match fields are present, and the resource has been parsed correctly
      config :default_category, :validate => :string, :default => "Administrative"

      # These fields must be present to match to the default default category
      config :default_match, :validate => :array, :default => ["operationName", "level"]

      # Possible [azure][category] values for [azure][group] = "activity_log", the category names must be mutually exclusive between groups
      config :activity_log_categories, :validate => :array, :default => ["Administrative", "ServiceHealth", "Alert", "Autoscale", "Security"]

      # Possible [azure][category] values for [azure][group] = "sql_diagnostics", the category names must be mutually exclusive between groups
      config :sql_diagnostics_categories, :validate => :array, :default =>
          ["Metric", "Blocks", "Errors", "Timeouts", "QueryStoreRuntimeStatistics", "QueryStoreWaitStatistics", "DatabaseWaitStatistics", "SQLInsights"]

      # Append values to the `tags` field when there has been not been a match to a known azure event group or category.
      config :tag_on_failure, :validate => :array, :default => ["_azure_event_failure"]

      ACTIVITY_LOG_GROUP = "activity_log".freeze
      SQL_DIAGNOSTICS_GROUP = "sql_diagnostics".freeze

      def register
        # do nothing
      end

      def filter(event)
        resource_id = event.get("resourceId")
        if resource_id && add_resources(resource_id, event) && add_group_and_category(event)
          # rename properties to include the group/category to help avoid mapping errors
          if event.get("properties")
            group = event.get("[azure][group]")
            category = event.get("[azure][category]")
            explode_properties(group, category, event)
            event.set("[#{group}_#{category}_properties]", event.get("properties"))
            event.remove("properties")
          end
          filter_matched(event)
        else
          @tag_on_failure.each do |tag|
            event.tag(tag)
          end
          logger.trace("Failed to parse event as an Azure Event", :event => event) if logger.trace?
        end
      end

      # public methods may change state of event, and should return true if successful

      ##
      # Parses the resourceId to pull out the relevant parts into the event
      # return true if the common set of fields can be extracted from the resourceId, false otherwise
      def add_resources(resource_id, event)
        common_resources = explode_common_resources(resource_id)
        if common_resources
          common_resources.each do |k, v|
            event.set("[azure][#{k}]", v)
          end

          if common_resources["provider"] == "MICROSOFT.SQL"
            sql_resources = explode_sql_resources(resource_id)
            if sql_resources
              sql_resources.each do |k, v|
                event.set("[azure][#{k}]", v)
              end
            end
          end
        end
        !common_resources.nil?
      end

      ##
      # adds a group and category to the provided event
      # return true if the group and category are added, false otherwise
      def add_group_and_category(event)
        #always prefer @metadata category over the heuristics
        category = event.get("[@metadata][category]")
        if category.nil?
          category = find_category(event)
        end
        event.set("[azure][category]", category) if category
        group = @activity_log_categories.include?(category) ? ACTIVITY_LOG_GROUP : @sql_diagnostics_categories.include?(category) ? SQL_DIAGNOSTICS_GROUP : nil
        event.set("[azure][group]", group) if group

        !category.nil?
      end

      ##
      # Based on the group and category, explode the custom properties bag
      def explode_properties(group, category, event)
        if group == ACTIVITY_LOG_GROUP && category == "ServiceHealth"
          add_json_event_properties(event)
        end
      end

      # Some events such as Service Health can have a Json inside Json as [properties][eventProperties]. This will explode the inner json and replace it with indivisual fields on the event.
      def add_json_event_properties(event)
        inner_json = event.get("[properties][eventProperties]")
        inner_json_as_hash = json_to_hash(inner_json)
        if inner_json_as_hash
          inner_json_as_hash.each do |k, v|
            event.set("[properties][#{k}]", v)
          end
          event.remove("[properties][eventProperties]")
        end
      end

      # private methods should not change the state of the event
      private

      CONST_FIELD_NAMES = {
          "SUBSCRIPTIONS" => "subscription",
          "RESOURCEGROUPS" =>"resource_group",
          "PROVIDERS" => "provider"
      }.freeze

      ##
      # In general the format of the resourceID for all types is:
      # /SUBSCRIPTIONS/<subscription>/RESOURCEGROUPS/<resource_group>/PROVIDERS/<provider>/<resource_type1>/<resource_name1>/<resource_typeN/<resource_nameN>
      # However, it can be something as short as
      # /SUBSCRIPTIONS/<subscription>
      # It was also observed to be:
      # /SUBSCRIPTIONS/<subscription>/PROVIDERS/<provider>
      # Or as long as needed where the resource_type/resource_name pairings can continue N times.
      # The display values for repeating resource_type/resource_name pairings should be:
      # resource_type = resource_type1/resource_type2/resource_typeN (concat the types separated by a "/")
      # resource_name = resource_nameN (don't concat the names, only use the last)
      # returns a hash of the key/value pairings with VALUE always UPPERCASE, returns nil if there are not at least 2 parts
      ##
      def explode_common_resources(_resource_id)
        resource_id = _resource_id.upcase
        logger.debug("parsing resourceId={}", resource_id)
        grouped_parts = {}
        parts = resource_id.split("/")
        return nil unless parts.size >= 3
        return nil unless parts.shift == "" # split returns an empty first result when the string starts with the split value

        index = 1
        const_count = 0
        const_count += 1 if resource_id.include?("/SUBSCRIPTIONS/")
        const_count += 1 if resource_id.include?("/RESOURCEGROUPS/")
        const_count += 1 if resource_id.include?("/PROVIDERS/")

        const_count.times do
          const = parts.shift
          index += const.size + 1
          part_name = to_field_name(const)
          value = parts.shift
          index += value.size + 1
          grouped_parts[part_name] = value if part_name
        end

        type_name_repeating = resource_id[index, resource_id.size]

        # For a/b/c/d/e/f , resource_type = a/c/e, resource_name = f
        if type_name_repeating
          type_name_repeating_pairs = type_name_repeating.split("/")
          grouped_parts["resource_name"] = type_name_repeating_pairs.last
          grouped_parts["resource_type"] = type_name_repeating_pairs.each_slice(2).map(&:first).join("/")
        end
        grouped_parts
      end

      def to_field_name(const)
        CONST_FIELD_NAMES[const]
      end

      ##
      #  Retrieve resources from a MICROSOFT.SQL provider resource_id
      # /SUBSCRIPTIONS/<subscription>/RESOURCEGROUPS/<resource_group>/PROVIDERS/MICROSOFT.SQL/SERVERS/<server>/DATABASES/<database>
      # returns a hash of the key/value pairings for server and database, with VALUE always UPPERCASE, nil if ANY expectations of the format are not found
      def explode_sql_resources(resource_id)
        grouped_parts = {}
        parts = resource_id.upcase.split("/", 11)
        return nil unless parts.size == 11
        parts[7] == "SERVERS" ? grouped_parts["server"] = parts[8] : (return nil)
        parts[9] == "DATABASES" ? grouped_parts["database"] = parts[10] : (return nil)
        grouped_parts["server_and_database"] = parts[8] + "/" + parts[10]
        grouped_parts["db_unique_id"] = parts[2] + "/" + parts[4] + "/" + parts[8] + "/" + parts[10]
        grouped_parts
      end

      ##
      # returns the Hash of the provided json, nil if not json
      def json_to_hash(json)
        if json && json.to_s.strip[0] == "{" #faster then throwing an exception if not json
          begin
            LogStash::Json.load(json)
          rescue
            # Do nothing, there are no documented guarantees that this is indeed Json
            nil
          end
        end
      end

      ##
      # finds the category based on event heuristics
      # returns the category as string if can be found, nil otherwise
      def find_category(event)
        category = find_category_sql_diagnostics(event)
        category ||= find_category_activity_log(event)
        category ||= find_category_default(event)
        category
      end

      ##
      # attempt to find the category of an sql diagnostic log
      # returns the category if can match the heuristics for sql_diagnostic logs, nil otherwise
      def find_category_sql_diagnostics(event)
        return nil unless event.get("[azure][provider]") == "MICROSOFT.SQL"
        event.get("metricName") ? "Metric" : event.get("category")
       end

      ##
      # attempt to find the category of an activity log
      # returns the category if can match the heuristics for activity logs, nil otherwise
      def find_category_activity_log(event)
        category = event.get("[properties][eventCategory]") #observerd location
        category ||= event.get("[category][value]")  #documented location
        category = "Security" if category == "Recommendation"
        category
      end

      ##
      # attempt to apply the default category
      # returns the default category if and only if all the default_match parameters exist in the event
      def find_category_default(event)
        if @default_match.all? {|match| event.get(match)}
          @default_category
        else
          nil
        end
      end
    end
  end
end

