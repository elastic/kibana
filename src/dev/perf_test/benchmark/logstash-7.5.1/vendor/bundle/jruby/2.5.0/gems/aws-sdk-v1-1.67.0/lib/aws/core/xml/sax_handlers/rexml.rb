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

require 'rexml/document'
require 'rexml/streamlistener'

module AWS
  module Core
    module XML
      module SaxHandlers
        class REXML

          include FrameStack
          include ::REXML::StreamListener

          def sax_parse xml
            source = ::REXML::Source.new(xml)
            ::REXML::Parsers::StreamParser.new(source, self).parse
          end

          def tag_start name, attrs
            start_element(name, attrs)
          end

          def tag_end name
            end_element
          end

          def text(chars)
            set_text(chars)
          end

        end
      end
    end
  end
end
