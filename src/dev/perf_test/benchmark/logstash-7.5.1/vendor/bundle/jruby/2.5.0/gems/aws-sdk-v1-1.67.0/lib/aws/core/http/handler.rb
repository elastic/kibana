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
  module Core
    module Http

      # @api private
      class Handler

        attr_reader :base

        def initialize(base, &block)
          @base = base
          if base.respond_to?(:handle)

            unless [2,3].include?(block.arity)
              raise ArgumentError, 'passed block must accept 2 or 3 arguments'
            end

            MetaUtils.extend_method(self, :handle, &block)

            if block.arity == 3
              m = Module.new do
                eval(<<-DEF)
                  def handle req, resp, &read_block
                    super(req, resp, read_block)
                  end
                DEF
              end
              self.extend(m)
            end

          elsif base.respond_to?(:handle_async)

            unless block.arity == 3
              raise ArgumentError, 'passed block must accept 3 arguments'
            end

            MetaUtils.extend_method(self, :handle_async) do |req, resp, handle|
              @base.handle_async(req, resp, handle)
            end
            MetaUtils.extend(self) do
              define_method(:handle) do |req, resp|
                raise "attempted to call #handle on an async handler"
              end
              define_method(:handle_async, &block)
            end

          else
            raise ArgumentError, 'base must respond to #handle or #handle_async'
          end
        end

        def handle(request, http_response, &read_block)
          @base.handle(request, http_response, &read_block)
        end

        def handle_async(request, http_response, handle)
          Thread.new do
            begin
              self.handle(request, http_response)
            rescue => e
              handle.signal_failure
            else
              handle.signal_success
            end
          end
        end

        def sleep_with_callback seconds, &block
          Kernel.sleep(seconds)
          yield
        end

      end
    end
  end
end
