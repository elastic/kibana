# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

module Elasticsearch
  module API
    module Actions

      # Update the password of the specified user
      def update_password(arguments={})
        method = HTTP_PUT
        path   = Utils.__pathify '_xpack/security/user/',
                                 Utils.__escape(arguments[:user]),
                                 '/_password'
        params = {}
        body   = {
            "password" => "#{arguments[:password]}"
        }
        perform_request(method, path, params, body).body
      end
    end
  end
end
