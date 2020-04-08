module Aws
  module Plugins

    # The Amazon Route 53 API returns hosted zones and request Ids as strings
    # formatted like:
    #
    #     '/hostedzone/ID'
    #     '/change/ID'
    #
    # However, their API does not accept Ids with the '/hostedzone/' or
    # '/change/' prefixes. This plugin removes those prefixes before
    # serializing their Ids onto the request. This allows a user to
    # use the prefixed Ids returned in {Aws::Route53::Client} responses.
    class Route53IdFix < Seahorse::Client::Plugin

      class Handler < Seahorse::Client::Handler

        def call(context)
          remove_id_prefixes(context.params)
          @handler.call(context)
        end

        private

        def remove_id_prefixes(params)
          # Many operations accept of :id or :hosted_zone_id as a root-level
          # param, pruning prefixes from those.
          [:id, :hosted_zone_id, :delegation_set_id].each do |key|
            params[key] = remove_prefix(params[key]) if params[key]
          end

          # The `#change_resource_record_sets operation` has a deeply nested
          # target with a :hosted_zone_id that needs to be pruned.
          if params[:change_batch]
            params[:change_batch][:changes].each do |batch|
              if target = batch[:resource_record_set][:alias_target]
                target[:hosted_zone_id] = remove_prefix(target[:hosted_zone_id])
              end
            end
          end
        end

        def remove_prefix(str)
          str.sub(/^\/(hostedzone|change|delegationset)\//, '')
        end

      end

      # Run this handler after params have been validated, but before
      # they are serialized onto the request
      handler(Handler, priority: 99, step: :build)

    end
  end
end
