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
    module XML
      class Parser

        # @param [Hash] rules A has of xml parsing rules.  Generally
        #   rules will come from an xml grammar.
        def initialize rules = {}
          @rules = rules
        end

        # @return [Hash] Returns the rules for this xml parser that define
        #   how it should transform the XMl into Ruby.
        attr_reader :rules

        # @param [String] xml An XML document string to parse.
        # @return [Hash] Returns a hash of parsed xml data.
        def parse xml
          xml = '<xml/>' if xml.nil? or xml.empty?
          sax_handler.parse(xml)
        end

        # @return [Hash] Returns a hash of mostly empty placeholder data.
        def simulate
          XML::Stub.simulate(rules)
        end

        # @param [String] xml An XML document string to parse.
        # @param [Hash] rules A has of xml parsing rules.  Generally
        #   rules will come from an xml grammar.
        # @return [Hash] Returns a hash of parsed xml data.
        def self.parse xml, rules = {}
          self.new(rules).parse(xml)
        end

        protected

        # There are three handlers, nokogiri is the fastest, followed
        # by libxml-ruby.  Lastly (by a long shot) is REXML.  REXML
        # is the only library that does not  rely on a native
        # extension.
        #
        # Currently you can not choose your xml sax handler, and the only
        # we express a gem dependency on is nokogiri.
        #
        def sax_handler
          begin
            SaxHandlers::Nokogiri.new(rules)
          rescue NameError, LoadError
            SaxHandlers::REXML.new(rules)
          end
        end

      end
    end
  end
end
