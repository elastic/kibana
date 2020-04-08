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

require 'base64'
require 'date'
require 'time'

module AWS
  module Core
    module XML
      class Frame

        TRANSLATE_DIGITS = ['0123456789'.freeze, ('X'*10).freeze]

        EASY_FORMAT = "XXXX-XX-XXTXX:XX:XX.XXXZ".freeze

        DATE_PUNCTUATION = ['-:.TZ'.freeze, (' '*5).freeze]

        def initialize root_frame, parent_frame, element_name, rules

          @root_frame = root_frame
          @parent_frame = parent_frame
          @element_name = element_name
          @rules = rules
          @rules[:children] ||= {}

          @data = {}.merge(rules[:defaults] || {})
          @text = nil

          # initialize values for child frames of special types (e.g.
          # lists, maps, and forced elements)
          known_child_frames.each do |child_frame|
            context = data_context_for(child_frame)
            if child_frame.list?
              context[child_frame.ruby_name] = []
            elsif child_frame.map?
              context[child_frame.ruby_name] = {}
            elsif child_frame.forced?
              context[child_frame.ruby_name] = child_frame.value
            end
          end

        end

        attr_reader :root_frame
        attr_reader :parent_frame
        attr_reader :element_name
        attr_reader :rules

        def data
          ignored? ? parent_frame.data : @data
        end

        def ruby_name
          rules[:rename] || root_frame.inflect(element_name)
        end

        def rules_for child_element_name
          rules[:children][child_element_name] || {}
        end

        # The list of child frames that have customizations (rules), all
        # other children will be parsed using standard rules
        def known_child_frames
          rules[:children].keys.map {|name| build_child_frame(name) }
        end

        def build_child_frame element_name
          # if element_name should be wrapped
          #   build a frame for the wrapper
          #   build a child frame from the wrapper
          # else
          Frame.new(root_frame, self, element_name, rules_for(element_name))
        end

        def consume_child_frame child_frame

          child_frame.close

          return if child_frame.ignored?

          ruby_name = child_frame.ruby_name
          value = child_frame.value
          context = data_context_for(child_frame)

          if child_frame.list?
            context[ruby_name] << value
          elsif map = child_frame.map?
            context[ruby_name][child_frame.map_key] = child_frame.map_value
          else
            context[ruby_name] = value
          end
        end

        def close
          # some xml elements should be indexed at the root level
          # The :index rule determines the name of this index
          # and what keys the data should be indexed as (one element
          # can be indexed under multiple keys).  The index value
          # is always the element itself.
          if index = @rules[:index]
            index_keys_for(index) do |key|
              root_frame.add_to_index(index[:name], key, data)
            end
          end
        end

        def index_keys_for index_opts, &block

          # simple (single) key
          if key = index_opts[:key]
            yield(data[key])
            return
          end

          # composite key, joined by ":"
          if parts = index_opts[:keys]
            composite_key = parts.map{|part| data[part] }.join(":")
            yield(composite_key)
            return
          end

          # multiple keys, collected from the given path
          if path = index_opts[:key_path]
            keys_from_path(data, path.dup, &block)
            return
          end

          raise "missing require index rule option, :key, :keys or :key_path"

        end

        def keys_from_path data, path, &block

          step = path.shift
          value = data[step]

          if path.empty?
            yield(value)
            return
          end

          if value.is_a?(Array)
            value.each do |v|
              keys_from_path(v, path.dup, &block)
            end
          else
            keys_from_path(value, path.dup, &block)
          end

        end

        def add_text chars
          @text ||= ''
          @text << chars
        end

        def value
          if !data.empty?
            data[:encoding] == 'base64' ?  Base64.decode64(@text.strip) : data
          elsif @text.nil?
            rules[:type] == :boolean ? false : nil
          else
            case rules[:type]
            when nil, :string then @text
            when :datetime    then datetime_like_value(DateTime, :civil)
            when :time        then datetime_like_value(Time, :utc)
            when :integer     then @text.to_i
            when :float       then @text.to_f
            when :boolean     then @text == 'true'
            when :blob        then Base64.decode64(@text)
            when :symbol      then Core::Inflection.ruby_name(@text).to_sym
            else raise "unhandled type"
            end
          end
        end

        def ignored?
          @rules[:ignore]
        end

        def forced?
          @rules[:force]
        end

        def list?
          @rules[:list]
        end

        def map?
          @rules[:map]
        end

        def wrapped?
          @rules[:wrap]
        end
        alias_method :wrapper, :wrapped?

        protected

        def map_key
          data[root_frame.inflect(@rules[:map].first)]
        end

        def map_value
          data[root_frame.inflect(@rules[:map].last)]
        end

        def data_context_for child_frame
          if child_frame.wrapped?
            data[child_frame.wrapper] ||= {}
            data[child_frame.wrapper]
          else
            data
          end
        end

        def datetime_like_value klass, parts_constructor
          # it's way faster to parse this specific format manually
          # vs. DateTime#parse, and this happens to be the format
          # that AWS uses almost (??) everywhere.
          if @text.tr(*TRANSLATE_DIGITS) == EASY_FORMAT
            parts = @text.tr(*DATE_PUNCTUATION).chop.split.map {|p| p.to_i }
            milliseconds = parts.pop
            parts[-1] = parts[-1] + Rational(milliseconds, 1000)  #Ruby 1.8.7 compatibility
            klass.send(parts_constructor, *parts)
          else
            # fallback in case we have to handle another date format
            klass.parse(@text)
          end
        end

      end
    end
  end
end
