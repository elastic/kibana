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
  module Record

    # Provides a way to track changes in your records.
    #
    #     my_book = Book['bookid']
    #
    #     my_book.changed? #=> false
    #     my_book.title #=> "My Book"
    #     my_book.title = "My Awesome Book"
    #     my_book.changed? #=> true
    #
    #     my_book = Book['bookid']
    #
    # You can inspect further and get a list of changed attributes
    #
    #     my_book.changed #=> ['title']
    #
    # Or you can get a more detailed description of the changes.  {#changes}
    # returns a hash of changed attributes (keys) with their old and new
    # values.
    #
    #     my_book.changes
    #     #=> { 'title' => ['My Book', 'My Awesome Book']
    #
    # For every configured attribute you also get a handful of methods
    # for inspecting changes on that attribute.  Given the following
    # attribute:
    #
    #     string_attr :title
    #
    # You can now call any of the following methods:
    #
    #   * title_changed?
    #   * title_change
    #   * title_was
    #   * reset_title!
    #   * title_will_change!
    #
    # Given the title change from above:
    #
    #     my_book.title_changed? #=> true
    #     my_book.title_change #=> ['My Book', 'My Awesome Book']
    #     my_book.title_was #=> ['My Book']
    #
    #     my_book.reset_title!
    #     my_book.title #=> 'My Book'
    #
    # ## In-Place Editing
    #
    # Dirty tracking works by comparing incoming attribute values upon
    # assignment against the value that was there previously.  If you
    # use functions against the value that modify it (like gsub!)
    # you must notify your record about the coming change.
    #
    #     my_book.title #=> 'My Book'
    #     my_book.title_will_change!
    #     my_book.title.gsub!(/My/, 'Your')
    #     my_book.title_change #=> ['My Book', 'Your Book']
    #
    # ## Partial Updates
    #
    # Dirty tracking makes it possible to only persist those attributes
    # that have changed since they were loaded.  This speeds up requests
    # against AWS when saving data.
    #
    module DirtyTracking

      # Returns true if this model has unsaved changes.
      #
      #     b = Book.new(:title => 'My Book')
      #     b.changed?
      #     #=> true
      #
      # New objects and objects freshly loaded should not have any changes:
      #
      #     b = Book.new
      #     b.changed?      #=> false
      #
      #     b = Book.first
      #     b.changed?      #=> false
      #
      # @return [Boolean] Returns true if any of the attributes have
      #   unsaved changes.
      def changed?
        !orig_values.empty?
      end

      # Returns an array of attribute names that have changes.
      #
      #     book.changed #=> []
      #     person.title = 'New Title'
      #     book.changed #=> ['title']
      #
      # @return [Array] Returns an array of attribute names that have
      #   unsaved changes.
      def changed
        orig_values.keys
      end

      # Returns the changed attributes in a hash.  Keys are attribute names,
      # values are two value arrays.  The first value is the previous
      # attribute value, the second is the current attribute value.
      #
      #     book.title = 'New Title'
      #     book.changes
      #     #=> { 'title' => ['Old Title', 'New Title'] }
      #
      # @return [Hash] Returns a hash of attribute changes.
      def changes
        changed.inject({}) do |changes, attr_name|
          changes[attr_name] = attribute_change(attr_name)
          changes
        end
      end

      # Returns true if the named attribute has unsaved changes.
      #
      # This is an attribute method.  The following two expressions
      # are equivilent:
      #
      #     book.title_changed?
      #     book.attribute_changed?(:title)
      #
      # @param [String] attribute_name Name of the attribute to check
      #   for changes.
      #
      # @return [Boolean] Returns true if the named attribute
      #   has unsaved changes.
      # @api private
      private
      def attribute_changed? attribute_name
        orig_values.keys.include?(attribute_name)
      end

      # Returns an array of the old value and the new value for
      # attributes that have unsaved changes, returns nil otherwise.
      #
      # This is an attribute method.  The following two expressions
      # are equivilent:
      #
      #     book.title_change
      #     book.attribute_change(:title)
      #
      # @example Asking for changes on an unchanged attribute
      #
      #   book = Book.new
      #   book.title_change #=> nil
      #
      # @example Getting changed attributes on a new object
      #
      #   book = Book.new(:title => 'My Book')
      #   book.title_change #=> [nil, 'My Book']
      #
      # @example Getting changed attributes on a loaded object
      #
      #   book = Book.first
      #   book.title = 'New Title'
      #   book.title_change #=> ['Old Title', 'New Title']
      #
      # @param [String] attribute_name Name of the attribute to fetch
      #   a change for.
      # @return [Boolean] Returns true if the named attribute
      #   has unsaved changes.
      # @api private
      private
      def attribute_change attribute_name
        self.class.attribute_for(attribute_name) do |attribute|
          if orig_values.has_key?(attribute.name)
            [orig_values[attribute.name], __send__(attribute.name)]
          else
            nil
          end
        end
      end

      # Returns the previous value for changed attributes, or the current
      # value for unchanged attributes.
      #
      # This is an attribute method.  The following two expressions
      # are equivilent:
      #
      #      book.title_was
      #      book.attribute_was(:title)
      #
      # @example Returns the previous value for changed attributes:
      #
      #   book = Book.where(:title => 'My Book').first
      #   book.title = 'New Title'
      #   book.title_was #=> 'My Book'
      #
      # @example Returns the current value for unchanged attributes:
      #
      #   book = Book.where(:title => 'My Book').first
      #   book.title_was #=> 'My Book'
      #
      # @return Returns the previous value for changed attributes
      #   or the current value for unchanged attributes.
      # @api private
      private
      def attribute_was attribute_name
        self.class.attribute_for(attribute_name) do |attribute|
          name = attribute.name
          orig_values.has_key?(name) ? orig_values[name] : __send__(name)
        end
      end

      # Reverts any changes to the attribute, restoring its original value.
      # @param [String] attribute_name Name of the attribute to reset.
      # @return [nil]
      # @api private
      private
      def reset_attribute! attribute_name
        __send__("#{attribute_name}=", attribute_was(attribute_name))
        nil
      end

      # Indicate to the record that you are about to edit an attribute
      # in place.
      # @param [String] attribute_name Name of the attribute that will
      #   be changed.
      # @return [nil]
      # @api private
      private
      def attribute_will_change! attribute_name
        self.class.attribute_for(attribute_name) do |attribute|
          name = attribute.name
          unless orig_values.has_key?(name)
            was = __send__(name)
            begin
              # booleans, nil, etc all #respond_to?(:clone), but they raise
              # a TypeError when you attempt to dup them.
              orig_values[name] = was.clone
            rescue TypeError
              orig_values[name] = was
            end
          end
        end
        nil
      end

      private
      def orig_values
        @_orig_values ||= {}
      end

      private
      def clear_change! attribute_name
        orig_values.delete(attribute_name)
      end

      private
      def ignore_changes &block
        begin
          @_ignore_changes = true
          yield
        ensure
          @_ignore_changes = false
        end
      end

      private
      def if_tracking_changes &block
        yield unless @_ignore_changes
      end

      private
      def clear_changes!
        orig_values.clear
      end

    end
  end
end
