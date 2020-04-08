module Seahorse

  autoload :Util, 'seahorse/util'

  module Client

    autoload :Base, 'seahorse/client/base'
    autoload :BlockIO, 'seahorse/client/block_io'
    autoload :Configuration, 'seahorse/client/configuration'
    autoload :Handler, 'seahorse/client/handler'
    autoload :HandlerBuilder, 'seahorse/client/handler_builder'
    autoload :HandlerList, 'seahorse/client/handler_list'
    autoload :HandlerListEntry, 'seahorse/client/handler_list_entry'
    autoload :ManagedFile, 'seahorse/client/managed_file'
    autoload :NetworkingError, 'seahorse/client/networking_error'
    autoload :Plugin, 'seahorse/client/plugin'
    autoload :PluginList, 'seahorse/client/plugin_list'
    autoload :Request, 'seahorse/client/request'
    autoload :RequestContext, 'seahorse/client/request_context'
    autoload :Response, 'seahorse/client/response'

    module Http
      autoload :Headers, 'seahorse/client/http/headers'
      autoload :Request, 'seahorse/client/http/request'
      autoload :Response, 'seahorse/client/http/response'
    end

    # The following module has been deprecated.
    # @api private
    module Logging
      autoload :Handler, 'seahorse/client/logging/handler'
      autoload :Formatter, 'seahorse/client/logging/formatter'
    end

    # @api private
    module NetHttp
      autoload :ConnectionPool, 'seahorse/client/net_http/connection_pool'
      autoload :Handler, 'seahorse/client/net_http/handler'
      autoload :Patches, 'seahorse/client/net_http/patches'
    end

    module Plugins
      autoload :ContentLength, 'seahorse/client/plugins/content_length'
      autoload :Endpoint, 'seahorse/client/plugins/endpoint'
      autoload :Logging, 'seahorse/client/plugins/logging'
      autoload :NetHttp, 'seahorse/client/plugins/net_http'
      autoload :RaiseResponseErrors, 'seahorse/client/plugins/raise_response_errors'
      autoload :ResponseTarget, 'seahorse/client/plugins/response_target'
      autoload :RestfulBindings, 'seahorse/client/plugins/restful_bindings'
    end

  end

  module Model
    autoload :Api, 'seahorse/model/api'
    autoload :Operation, 'seahorse/model/operation'
    autoload :Shapes, 'seahorse/model/shapes'
  end

end
