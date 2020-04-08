module Aws
  module Resources
    class Documenter
      class WaiterOperationDocumenter < BaseOperationDocumenter

        def docstring
          super + ' ' + <<-DOCSTRING.lstrip
Waits until this #{resource_class_name} is #{state}. This method
waits by polling {Client##{api_request_name}} until successful. An error is
raised after a configurable number of failed checks.

This waiter uses the following defaults:

| Configuration   | Default                |
|-----------------|------------------------|
| `#delay`        | #{waiter.delay}        |
| `#max_attempts` | #{waiter.max_attempts} |

You can modify defaults and register callbacks by passing a block argument.
@yieldparam [Waiters::Waiter] waiter
@raise [Waiters::Errors::WaiterFailed]
@see Client#wait_until
          DOCSTRING
        end

        def return_tag
          tag("@return [#{resource_class_name}] #{return_message}")
        end

        def return_message
          if @operation.path
            "Returns a copy of this #{resource_class_name} with loaded data."
          else
            "Returns a copy of this #{resource_class_name} that is not loaded."
          end
        end

        def state
          operation_name.to_s.sub('wait_until_', '')
        end

        def waiter
          @resource_class.client_class.waiters.waiter(@operation.waiter_name)
        end

        def api_request
          @resource_class.client_class.api.operation(api_request_name)
        end

        def api_request_name
          waiter.poller.operation_name
        end

        def option_tags
          []
        end

        def example_tags
          example = <<-EXAMPLE.strip
@example Basic usage
  #{variable_name}.#{operation_name}

@example Modify default configuration
  #{variable_name}.#{operation_name} do |w|
     w.interval = 10
     w.max_attempts = 100
     w.before_attempt { |count| ... }
     w.before_wait do { |count, prev_resp| ... }
  end
          EXAMPLE
          [tag(example)]
        end

      end
    end
  end
end
