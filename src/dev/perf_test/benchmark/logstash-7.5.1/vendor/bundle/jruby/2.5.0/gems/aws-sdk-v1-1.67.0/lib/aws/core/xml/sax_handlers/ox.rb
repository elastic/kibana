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

require 'stringio'
require 'ox'

module AWS
  module Core
    module XML
      module SaxHandlers
        class Ox

          include FrameStack

          def sax_parse xml
            ::Ox.sax_parse(self, StringIO.new(xml))
          end

          def start_element name
            super(name.to_s)
          end

          def attr name, value
            attributes(name.to_s => value)
          end

        end
      end
    end
  end
end
