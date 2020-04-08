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

    # Data is a light wrapper around a Ruby hash that provides
    # method missing access to the hash contents.
    #
    # ## Method Missing Access
    #
    # You can access hash content with methods if their keys
    # are symbols.
    #
    #     data = AWS::Core::Data.new({ :a => 1, :b => 2, :c => true })
    #     data.a #=> 1
    #     data.b #=> 2
    #     data.c #=> true
    #     data.d #=> raises NoMethodError
    #
    # ## Boolean Methods
    #
    # Given the structure above you can also use question-mark methods.
    #
    #     data.c? #=> true
    #     data.d? #=> raises NoMethodError
    #
    # ## Nested Hashes
    #
    # If the data contains nested hashes you can chain methods into
    # the structure.
    #
    #     data = AWS::Core::Data.new(:a => { :b => { :c => 'abc' }})
    #     data.a.b.c #=> 'abc'
    #
    # ## Nested Arrays
    #
    # Arrays are wrapped in {Data::List} objects.  They ensure any
    # data returned is correctly wrapped so you can continue using
    # method-missing access.
    #
    #     data = AWS::Core::Data.new(
    #      :people => [
    #        {:name => 'john'},
    #        {:name => 'jane'},
    #     ]})
    #
    #     data.people[0].name #=> 'john'
    #     data.people[1].name #=> 'jane'
    #
    #     data.people.map(&:name) #=> ['john','jane']
    #
    class Data

      module MethodMissingProxy

        # @api private
        def id
          self[:id] || self.id
        end

        def [] index_or_key
          Data.cast(@data[index_or_key])
        end

        # @return [Boolean] Returns true if the passed object equals
        #   the wrapped array.
        def eql? other
          if other.is_a?(MethodMissingProxy)
            @data == other._data
          else
            @data == other
          end
        end
        alias_method :==, :eql?

        def dup
          Data.cast(@data.dup)
        end
        alias_method :clone, :dup

        protected

        def method_missing *args, &block
          if block_given?
            return_value = @data.send(*args) do |*values|
              yield(*values.flatten.map{|v| Data.cast(v) })
            end
            Data.cast(return_value)
          else
            Data.cast(@data.send(*args))
          end
        end

        def _data
          @data
        end

      end

      include MethodMissingProxy

      def method_missing method_name, *args, &block
        if
          args.empty? and !block_given? and
          key = _remove_question_mark(method_name) and
          @data.has_key?(key)
        then
          Data.cast(@data[key])
        else
          super
        end
      end

      # @param [Hash] data The ruby hash of data you need wrapped.
      def initialize data
        @data = data
      end

      # @return [Hash] Returns contents of this Data object as a raw hash.
      def to_hash
        @data
      end
      alias_method :to_h, :to_hash

      # @return [Array]
      def to_a
        @data.to_a
      end
      alias_method :to_ary, :to_a

      # @param [String,Symbol] method_name
      # @return [Boolean] Returns true if this data object will
      #   respond to the given method name.
      def respond_to? method_name
        @data.key?(_remove_question_mark(method_name)) or
          @data.respond_to?(method_name)
      end

      # Returns an inspection string from the wrapped data.
      #
      #     data = AWS::Core::Data.new({ :a => 1, :b => 2, :c => true })
      #     data.inspect #=> '{:a=>1, :b=>2, :c=>true}'
      #
      # @return [String]
      #
      def inspect
        @data.inspect
      end

      # @api private
      def kind_of? klass
        if klass == Hash
          true
        else
          super
        end
      end
      alias_method :is_a?, :kind_of?

      protected

      def _remove_question_mark method_name
        case method_name
        when Symbol then method_name.to_s.sub(/\?$/, '').to_sym
        when String then method_name.sub(/\?$/, '')
        else method_name
        end
      end

      class << self

        # Given a hash, this method returns a {Data} object.  Given
        # an Array, this method returns a {Data::List} object.  Everything
        # else is returned as is.
        #
        # @param [Object] value The value to conditionally wrap.
        #
        # @return [Data,Data::List,Object] Wraps hashes and lists with
        #   Data and List objects, all other objects are returned as
        #   is.
        #
        def cast value
          case value
          when Hash then Data.new(value)
          when Array then Data::List.new(value)
          else value
          end
        end

      end

      class List

        include MethodMissingProxy

        # @param [Array] array
        def initialize array
          @data = array
        end

        # @return [String] Returns the inspection string for the
        #   wrapped array.
        def inspect
          @data.inspect
        end

        # @return [Array] Returns the contents of this Data::List as
        #   a raw array.
        def to_ary
          @data
        end
        alias_method :to_a, :to_ary

        # #inject works on Core::Data::List in in 1.8.7 and 1.9.3, but not
        # in 1.9.2 unless we define it like so.
        # @api private
        def inject *args, &block
          @data.inject(*args) do |obj,value|
            yield(Data.cast(obj),Data.cast(value))
          end
        end

        # @api private
        def kind_of? klass
          if klass == Array
            true
          else
            super
          end
        end
        alias_method :is_a?, :kind_of?

        # @api private
        def empty?
          @data.empty?
        end

      end
    end
  end
end
