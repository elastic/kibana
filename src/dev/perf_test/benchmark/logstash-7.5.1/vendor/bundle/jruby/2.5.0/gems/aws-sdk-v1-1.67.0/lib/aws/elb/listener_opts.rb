# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

module AWS
  class ELB

    # @api private
    module ListenerOpts

      # convert protocols from symbols to strings (e.g. :http to 'HTTP')
      protected
      def format_listener_opts options

        # accept the :load_balancer_port option by :port
        options[:load_balancer_port] = options.delete(:port) if
          options[:port]

        # convert symbolized protocol names into upper-cased strings
        [:protocol, :instance_protocol].each do |opt|
          options[opt] = options[opt].to_s.upcase if options[opt]
        end

        # convert iam server certificates into the ssl certificate id
        if cert = options.delete(:server_certificate)
          options[:ssl_certificate_id] = cert.is_a?(IAM::ServerCertificate) ?
            cert.arn : cert
        end

        options

      end

    end
  end
end
