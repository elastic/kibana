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

require 'libxml'

module AWS
  module Core
    module XML
      module SaxHandlers
        class LibXML

          include FrameStack
          include ::LibXML::XML::SaxParser::Callbacks

          def sax_parse xml
            sax_parser = ::LibXML::XML::SaxParser.string(xml)
            sax_parser.callbacks = self
            sax_parser.parse
          end

          def on_start_element_ns element_name, attributes, *ignore
            start_element(element_name, attributes)
          end

          def on_end_element_ns *ignore
            end_element
          end

          def on_characters chars
            text(chars)
          end

        end
      end
    end
  end
end
