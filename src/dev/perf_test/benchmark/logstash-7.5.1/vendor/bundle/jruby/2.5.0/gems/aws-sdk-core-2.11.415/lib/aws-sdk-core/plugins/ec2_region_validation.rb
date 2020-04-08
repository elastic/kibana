module Aws
  module Plugins
    # @api private
    class EC2RegionValidation < Seahorse::Client::Plugin

      def after_initialize(client)
        if region = client.config.region
          if matches = region.match(/^(\w+-\w+-\d+)[a-z]$/)
            msg = ":region option must a region name, not an availability "
            msg << "zone name; try `#{matches[1]}' instead of `#{matches[0]}'"
            raise ArgumentError, msg
          end
        end
      end
    end
  end
end
