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

require 'nokogiri'

module AWS
  module Core
    module XML
      module SaxHandlers
        class Nokogiri

          include FrameStack

          def sax_parse xml
            ::Nokogiri::XML::SAX::Parser.new(self).parse(xml)
          end

          def xmldecl(*args); end
          def start_document; end
          def end_document; end
          def error(*args); end
          def comment(*args); end

          def start_element_namespace element_name, attributes = [], *ignore

            attributes = attributes.map.inject({}) do |hash,attr|
              hash.merge(attr.localname => attr.value)
            end

            start_element(element_name, attributes)

          end

          def end_element_namespace *ignore
            end_element
          end

          def characters chars
            set_text(chars)
          end

        end
      end
    end
  end
end
