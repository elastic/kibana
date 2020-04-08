require "logstash/outputs/elasticsearch/template_manager"

module LogStash; module Outputs; class ElasticSearch;
  module Common
    attr_reader :client, :hosts

    # These codes apply to documents, not at the request level
    DOC_DLQ_CODES = [400, 404]
    DOC_SUCCESS_CODES = [200, 201]
    DOC_CONFLICT_CODE = 409

    # When you use external versioning, you are communicating that you want
    # to ignore conflicts. More obviously, since an external version is a
    # constant part of the incoming document, we should not retry, as retrying
    # will never succeed.
    VERSION_TYPES_PERMITTING_CONFLICT = ["external", "external_gt", "external_gte"]

    def register
      @template_installed = Concurrent::AtomicBoolean.new(false)
      @stopping = Concurrent::AtomicBoolean.new(false)
      # To support BWC, we check if DLQ exists in core (< 5.4). If it doesn't, we use nil to resort to previous behavior.
      @dlq_writer = dlq_enabled? ? execution_context.dlq_writer : nil

      setup_hosts # properly sets @hosts
      build_client
      setup_after_successful_connection
      check_action_validity
      @bulk_request_metrics = metric.namespace(:bulk_requests)
      @document_level_metrics = metric.namespace(:documents)
      @logger.info("New Elasticsearch output", :class => self.class.name, :hosts => @hosts.map(&:sanitized).map(&:to_s))
    end

    # Receive an array of events and immediately attempt to index them (no buffering)
    def multi_receive(events)
      until @template_installed.true?
        sleep 1
      end
      retrying_submit(events.map {|e| event_action_tuple(e)})
    end

    def setup_after_successful_connection
      @template_installer ||= Thread.new do
        sleep_interval = @retry_initial_interval
        until successful_connection? || @stopping.true?
          @logger.debug("Waiting for connectivity to Elasticsearch cluster. Retrying in #{sleep_interval}s")
          Stud.stoppable_sleep(sleep_interval) { @stopping.true? }
          sleep_interval = next_sleep_interval(sleep_interval)
        end
        if successful_connection?
          discover_cluster_uuid
          install_template
          setup_ilm if ilm_in_use?
        end
      end
    end

    def stop_template_installer
      @template_installer.join unless @template_installer.nil?
    end

    def successful_connection?
      !!maximum_seen_major_version
    end

    def use_event_type?(client)
      client.maximum_seen_major_version < 8
    end

    # Convert the event into a 3-tuple of action, params, and event
    def event_action_tuple(event)
      action = event.sprintf(@action)

      params = {
        :_id => @document_id ? event.sprintf(@document_id) : nil,
        :_index => event.sprintf(@index),
        routing_field_name => @routing ? event.sprintf(@routing) : nil
      }

      params[:_type] = get_event_type(event) if use_event_type?(client)

      if @pipeline
        params[:pipeline] = event.sprintf(@pipeline)
      end

      if @parent
        if @join_field
          join_value = event.get(@join_field)
          parent_value = event.sprintf(@parent)
          event.set(@join_field, { "name" => join_value, "parent" => parent_value })
          params[routing_field_name] = event.sprintf(@parent)
        else
          params[:parent] = event.sprintf(@parent)
        end
      end

      if action == 'update'
        params[:_upsert] = LogStash::Json.load(event.sprintf(@upsert)) if @upsert != ""
        params[:_script] = event.sprintf(@script) if @script != ""
        params[retry_on_conflict_action_name] = @retry_on_conflict
      end

      if @version
        params[:version] = event.sprintf(@version)
      end

      if @version_type
        params[:version_type] = event.sprintf(@version_type)
      end

      [action, params, event]
    end

    def setup_hosts
      @hosts = Array(@hosts)
      if @hosts.empty?
        @logger.info("No 'host' set in elasticsearch output. Defaulting to localhost")
        @hosts.replace(["localhost"])
      end
    end

    def maximum_seen_major_version
      client.maximum_seen_major_version
    end

    def routing_field_name
      maximum_seen_major_version >= 6 ? :routing : :_routing
    end

    def retry_on_conflict_action_name
      maximum_seen_major_version >= 7 ? :retry_on_conflict : :_retry_on_conflict
    end

    def install_template
      TemplateManager.install_template(self)
      @template_installed.make_true
    end

    def discover_cluster_uuid
      return unless defined?(plugin_metadata)
      cluster_info = client.get('/')
      plugin_metadata.set(:cluster_uuid, cluster_info['cluster_uuid'])
    rescue => e
      # TODO introducing this logging message breaks many tests that need refactoring
      # @logger.error("Unable to retrieve elasticsearch cluster uuid", error => e.message)
    end

    def check_action_validity
      raise LogStash::ConfigurationError, "No action specified!" unless @action

      # If we're using string interpolation, we're good!
      return if @action =~ /%{.+}/
      return if valid_actions.include?(@action)

      raise LogStash::ConfigurationError, "Action '#{@action}' is invalid! Pick one of #{valid_actions} or use a sprintf style statement"
    end

    # To be overidden by the -java version
    VALID_HTTP_ACTIONS=["index", "delete", "create", "update"]
    def valid_actions
      VALID_HTTP_ACTIONS
    end

    def retrying_submit(actions)
      # Initially we submit the full list of actions
      submit_actions = actions

      sleep_interval = @retry_initial_interval

      while submit_actions && submit_actions.length > 0

        # We retry with whatever is didn't succeed
        begin
          submit_actions = submit(submit_actions)
          if submit_actions && submit_actions.size > 0
            @logger.info("Retrying individual bulk actions that failed or were rejected by the previous bulk request.", :count => submit_actions.size)
          end
        rescue => e
          @logger.error("Encountered an unexpected error submitting a bulk request! Will retry.",
                       :error_message => e.message,
                       :class => e.class.name,
                       :backtrace => e.backtrace)
        end

        # Everything was a success!
        break if !submit_actions || submit_actions.empty?

        # If we're retrying the action sleep for the recommended interval
        # Double the interval for the next time through to achieve exponential backoff
        Stud.stoppable_sleep(sleep_interval) { @stopping.true? }
        sleep_interval = next_sleep_interval(sleep_interval)
      end
    end

    def sleep_for_interval(sleep_interval)
      Stud.stoppable_sleep(sleep_interval) { @stopping.true? }
      next_sleep_interval(sleep_interval)
    end

    def next_sleep_interval(current_interval)
      doubled = current_interval * 2
      doubled > @retry_max_interval ? @retry_max_interval : doubled
    end

    def submit(actions)
      bulk_response = safe_bulk(actions)

      # If the response is nil that means we were in a retry loop
      # and aborted since we're shutting down
      return if bulk_response.nil?

      # If it did return and there are no errors we're good as well
      if bulk_response["errors"]
        @bulk_request_metrics.increment(:with_errors)
      else
        @bulk_request_metrics.increment(:successes)
        @document_level_metrics.increment(:successes, actions.size)
        return
      end

      actions_to_retry = []
      bulk_response["items"].each_with_index do |response,idx|
        action_type, action_props = response.first

        status = action_props["status"]
        failure  = action_props["error"]
        action = actions[idx]
        action_params = action[1]

        # Retry logic: If it is success, we move on. If it is a failure, we have 3 paths:
        # - For 409, we log and drop. there is nothing we can do
        # - For a mapping error, we send to dead letter queue for a human to intervene at a later point.
        # - For everything else there's mastercard. Yep, and we retry indefinitely. This should fix #572 and other transient network issues
        if DOC_SUCCESS_CODES.include?(status)
          @document_level_metrics.increment(:successes)
          next
        elsif DOC_CONFLICT_CODE == status
          @document_level_metrics.increment(:non_retryable_failures)
          @logger.warn "Failed action.", status: status, action: action, response: response if !failure_type_logging_whitelist.include?(failure["type"])
          next
        elsif DOC_DLQ_CODES.include?(status)
          handle_dlq_status("Could not index event to Elasticsearch.", action, status, response)
          @document_level_metrics.increment(:non_retryable_failures)
          next
        else
          # only log what the user whitelisted
          @document_level_metrics.increment(:retryable_failures)
          @logger.info "retrying failed action with response code: #{status} (#{failure})" if !failure_type_logging_whitelist.include?(failure["type"])
          actions_to_retry << action
        end
      end

      actions_to_retry
    end

    def handle_dlq_status(message, action, status, response)
      # To support bwc, we check if DLQ exists. otherwise we log and drop event (previous behavior)
      if @dlq_writer
        # TODO: Change this to send a map with { :status => status, :action => action } in the future
        @dlq_writer.write(action[2], "#{message} status: #{status}, action: #{action}, response: #{response}")
      else
        error_type = response.fetch('index', {}).fetch('error', {})['type']
        if 'invalid_index_name_exception' == error_type
          level = :error
        else
          level = :warn
        end
        @logger.send level, message, status: status, action: action, response: response
      end
    end

    # Determine the correct value for the 'type' field for the given event
    DEFAULT_EVENT_TYPE_ES6="doc".freeze
    DEFAULT_EVENT_TYPE_ES7="_doc".freeze
    def get_event_type(event)
      # Set the 'type' value for the index.
      type = if @document_type
               event.sprintf(@document_type)
             else
               if client.maximum_seen_major_version < 6
                 event.get("type") || DEFAULT_EVENT_TYPE_ES6
               elsif client.maximum_seen_major_version == 6
                 DEFAULT_EVENT_TYPE_ES6
               elsif client.maximum_seen_major_version == 7
                 DEFAULT_EVENT_TYPE_ES7
               else
                 nil
               end
             end

      if !(type.is_a?(String) || type.is_a?(Numeric))
        @logger.warn("Bad event type! Non-string/integer type value set!", :type_class => type.class, :type_value => type.to_s, :event => event)
      end

      type.to_s
    end

    # Rescue retryable errors during bulk submission
    def safe_bulk(actions)
      sleep_interval = @retry_initial_interval
      begin
        es_actions = actions.map {|action_type, params, event| [action_type, params, event.to_hash]}
        response = @client.bulk(es_actions)
        response
      rescue ::LogStash::Outputs::ElasticSearch::HttpClient::Pool::HostUnreachableError => e
        # If we can't even connect to the server let's just print out the URL (:hosts is actually a URL)
        # and let the user sort it out from there
        @logger.error(
          "Attempted to send a bulk request to elasticsearch'"+
            " but Elasticsearch appears to be unreachable or down!",
          :error_message => e.message,
          :class => e.class.name,
          :will_retry_in_seconds => sleep_interval
        )
        @logger.debug("Failed actions for last bad bulk request!", :actions => actions)

        # We retry until there are no errors! Errors should all go to the retry queue
        sleep_interval = sleep_for_interval(sleep_interval)
        @bulk_request_metrics.increment(:failures)
        retry unless @stopping.true?
      rescue ::LogStash::Outputs::ElasticSearch::HttpClient::Pool::NoConnectionAvailableError => e
        @logger.error(
          "Attempted to send a bulk request to elasticsearch, but no there are no living connections in the connection pool. Perhaps Elasticsearch is unreachable or down?",
          :error_message => e.message,
          :class => e.class.name,
          :will_retry_in_seconds => sleep_interval
        )
        Stud.stoppable_sleep(sleep_interval) { @stopping.true? }
        sleep_interval = next_sleep_interval(sleep_interval)
        @bulk_request_metrics.increment(:failures)
        retry unless @stopping.true?
      rescue ::LogStash::Outputs::ElasticSearch::HttpClient::Pool::BadResponseCodeError => e
        @bulk_request_metrics.increment(:failures)
        log_hash = {:code => e.response_code, :url => e.url.sanitized.to_s}
        log_hash[:body] = e.response_body if @logger.debug? # Generally this is too verbose
        message = "Encountered a retryable error. Will Retry with exponential backoff "

        # We treat 429s as a special case because these really aren't errors, but
        # rather just ES telling us to back off a bit, which we do.
        # The other retryable code is 503, which are true errors
        # Even though we retry the user should be made aware of these
        if e.response_code == 429
          logger.debug(message, log_hash)
        else
          logger.error(message, log_hash)
        end

        sleep_interval = sleep_for_interval(sleep_interval)
        retry
      rescue => e
        # Stuff that should never happen
        # For all other errors print out full connection issues
        @logger.error(
          "An unknown error occurred sending a bulk request to Elasticsearch. We will retry indefinitely",
          :error_message => e.message,
          :error_class => e.class.name,
          :backtrace => e.backtrace
        )

        @logger.debug("Failed actions for last bad bulk request!", :actions => actions)

        sleep_interval = sleep_for_interval(sleep_interval)
        @bulk_request_metrics.increment(:failures)
        retry unless @stopping.true?
      end
    end

    def default_index?(index)
      @index == LogStash::Outputs::ElasticSearch::CommonConfigs::DEFAULT_INDEX_NAME
    end

    def dlq_enabled?
      # TODO there should be a better way to query if DLQ is enabled
      # See more in: https://github.com/elastic/logstash/issues/8064
      respond_to?(:execution_context) && execution_context.respond_to?(:dlq_writer) &&
        !execution_context.dlq_writer.inner_writer.is_a?(::LogStash::Util::DummyDeadLetterQueueWriter)
    end
  end
end end end
