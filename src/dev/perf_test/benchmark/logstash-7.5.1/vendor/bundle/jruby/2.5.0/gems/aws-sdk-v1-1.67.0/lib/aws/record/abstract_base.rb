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

require 'set'

module AWS
  module Record
    module AbstractBase

      def self.extended base

        base.send(:extend, ClassMethods)
        base.send(:include, InstanceMethods)
        base.send(:include, DirtyTracking)
        base.send(:extend, Validations)

        # these 3 modules are for rails 3+ active model compatability
        base.send(:extend, Naming)
        base.send(:include, Naming)
        base.send(:include, Conversion)

      end

      module InstanceMethods

        # Constructs a new record.
        #
        # @param [Hash] attributes Attributes that should be bulk assigned
        #   to this record.  You can also specify the shard (i.e. domain
        #   or table) this record should persist to via `:shard`).
        #
        # @option attributes [String] :shard The domain/table this record
        #   should persist to.  If this is omitted, it will persist to the
        #   class default shard (which defaults to the class name).
        #
        # @return [Model,HashModel] Returns a new (non-persisted) record.
        #   Call {#save} to persist changes to AWS.
        #
        def initialize attributes = {}

          attributes = attributes.dup

          # supporting :domain for backwards compatability, :shard is prefered
          @_shard = attributes.delete(:domain)
          @_shard ||= attributes.delete('domain')
          @_shard ||= attributes.delete(:shard)
          @_shard ||= attributes.delete('shard')
          @_shard = self.class.shard_name(@_shard)

          @_data = {}
          assign_default_values
          bulk_assign(attributes)

        end

        # @return [String] Returns the name of the shard this record
        #   is persisted to or will be persisted to.  Defaults to the
        #   domain/table named after this record class.
        def shard
          @_shard
        end
        alias_method :domain, :shard # for backwards compatability

        # @return [Hash] A hash with attribute names as hash keys (strings) and
        #   attribute values (of mixed types) as hash values.
        def attributes
          attributes = Core::IndifferentHash.new
          self.class.attributes.keys.inject(attributes) do |hash,attr_name|
            hash.merge(attr_name => __send__(attr_name))
          end
        end

        # Acts like {#update} but does not call {#save}.
        #
        #     record.attributes = { :name => 'abc', :age => 20 }
        #
        # @param [Hash] attributes A hash of attributes to set on this record
        #   without calling save.
        #
        # @return [Hash] Returns the attribute hash that was passed in.
        #
        def attributes= attributes
          bulk_assign(attributes)
        end

        # Persistence indicates if the record has been saved previously or not.
        #
        # @example
        #   @recipe = Recipe.new(:name => 'Buttermilk Pancackes')
        #   @recipe.persisted? #=> false
        #   @recipe.save!
        #   @recipe.persisted? #=> true
        #
        # @return [Boolean] Returns true if this record has been persisted.
        def persisted?
          !!@_persisted
        end

        # @return [Boolean] Returns true if this record has not been persisted
        #   to SimpleDB.
        def new_record?
          !persisted?
        end

        # @param [Hash] opts Pass :validate => false to skip validations
        # @return [Boolean] Returns true if this record has no validation errors.
        def valid? opts = {}
          opts = {} if opts.nil?
          opts = {:validate => true}.merge(opts)
          run_validations if opts[:validate]
          errors.empty?
        end

        def errors
          @errors ||= Errors.new
        end

        # Creates new records, updates existing records.
        # @param [Hash] opts Pass :validate => false to skip validations
        # @return [Boolean] Returns true if the record saved without errors,
        #   false otherwise.
        def save opts = {}
          if valid?(opts)
            persisted? ? update : create
            clear_changes!
            true
          else
            false
          end
        end

        # Creates new records, updates exsting records.  If there is a validation
        # error then an exception is raised.
        # @raise [InvalidRecordError] Raised when the record has validation
        #   errors and can not be saved.
        # @return [true] Returns true after a successful save.
        def save!
          raise InvalidRecordError.new(self) unless save
          true
        end

        # Bulk assigns the attributes and then saves the record.
        # @param [Hash] attribute_hash A hash of attribute names (keys) and
        #   attribute values to assign to this record.
        # @return (see #save)
        def update_attributes attribute_hash
          bulk_assign(attribute_hash)
          save
        end

        # Bulk assigns the attributes and then saves the record.  Raises
        # an exception (AWS::Record::InvalidRecordError) if the record is not
        # valid.
        # @param (see #update_attributes)
        # @return [true]
        def update_attributes! attribute_hash
          if update_attributes(attribute_hash)
            true
          else
            raise InvalidRecordError.new(self)
          end
        end

        # Deletes the record.
        # @return [true]
        def delete
          if persisted?
            if deleted?
              raise 'unable to delete, this object has already been deleted'
            else
              delete_storage
              @_deleted = true
            end
          else
            raise 'unable to delete, this object has not been saved yet'
          end
        end
        alias_method :destroy, :delete

        # @return [Boolean] Returns true if this instance object has been deleted.
        def deleted?
          persisted? ? !!@_deleted : false
        end

        # If you define a custom setter, you use #[]= to set the value
        # on the record.
        #
        #     class Book < AWS::Record::Model
        #
        #       string_attr :name
        #
        #       # replace the default #author= method
        #       def author= name
        #         self['author'] = name.blank? ? 'Anonymous' : name
        #       end
        #
        #     end
        #
        # @param [String,Symbol] The attribute name to set a value for
        # @param attribute_value The value to assign.
        protected
        def []= attribute_name, new_value
          self.class.attribute_for(attribute_name) do |attribute|

            if_tracking_changes do
              original_value = type_cast(attribute, attribute_was(attribute.name))
              incoming_value = type_cast(attribute, new_value)
              if original_value == incoming_value
                clear_change!(attribute.name)
              else
                attribute_will_change!(attribute.name)
              end
            end

            @_data[attribute.name] = new_value

          end
        end

        # Returns the typecasted value for the named attribute.
        #
        #     book = Book.new(:title => 'My Book')
        #     book['title'] #=> 'My Book'
        #     book.title    #=> 'My Book'
        #
        # ### Intended Use
        #
        # This method's primary use is for getting/setting the value for
        # an attribute inside a custom method:
        #
        #     class Book < AWS::Record::Model
        #
        #       string_attr :title
        #
        #       def title
        #         self['title'] ? self['title'].upcase : nil
        #       end
        #
        #     end
        #
        #     book = Book.new(:title => 'My Book')
        #     book.title    #=> 'MY BOOK'
        #
        # @param [String,Symbol] attribute_name The name of the attribute to fetch
        #   a value for.
        # @return The current type-casted value for the named attribute.
        protected
        def [] attribute_name
          self.class.attribute_for(attribute_name) do |attribute|
            type_cast(attribute, @_data[attribute.name])
          end
        end

        protected
        def create
          populate_id
          touch_timestamps('created_at', 'updated_at')
          increment_optimistic_lock_value
          create_storage
          @_persisted = true
        end

        private
        def update
          return unless changed?
          touch_timestamps('updated_at')
          increment_optimistic_lock_value
          update_storage
        end

        protected
        def touch_timestamps *attributes
          now = Time.now
          attributes.each do |attr_name|
            if
              self.class.attributes[attr_name] and
              !attribute_changed?(attr_name)
              # don't touch timestamps the user modified
            then
              __send__("#{attr_name}=", now)
            end
          end
        end

        protected
        def increment_optimistic_lock_value
          if_locks_optimistically do |lock_attr|
            if value = self[lock_attr.name]
              self[lock_attr.name] = value + 1
            else
              self[lock_attr.name] = 1
            end
          end
        end

        protected
        def if_locks_optimistically &block
          if opt_lock_attr = self.class.optimistic_locking_attr
            yield(opt_lock_attr)
          end
        end

        protected
        def opt_lock_conditions
          conditions = {}
          if_locks_optimistically do |lock_attr|
            if was = attribute_was(lock_attr.name)
              conditions[:if] = { lock_attr.name => lock_attr.serialize(was) }
            else
              conditions[:unless_exists] = lock_attr.name
            end
          end
          conditions
        end

        private
        def assign_default_values
          # populate default attribute values
          ignore_changes do
            self.class.attributes.values.each do |attribute|
              default = attribute.default_value
              begin
                # copy default values down so methods like #gsub! don't
                # modify the default values for other objects
                @_data[attribute.name] = default.clone
              rescue TypeError
                @_data[attribute.name] = default
              end
            end
          end
        end

        private
        def bulk_assign hash
          flatten_date_parts(hash).each_pair do |attr_name, attr_value|
            __send__("#{attr_name}=", attr_value)
          end
        end

        private
        # Rails date and time select helpers split date and time
        # attributes into multiple values for form submission.
        # These attributes get named things like 'created_at(1i)'
        # and represent year/month/day/hour/min/sec parts of
        # the date/time.
        #
        # This method converts these attributes back into a single
        # value and converts them to Date and DateTime objects.
        def flatten_date_parts attributes

          multi_attributes = Set.new

          hash = attributes.inject({}) do |hash,(key,value)|
            # collects attribuets like "created_at(1i)" into an array of parts
            if key =~ /\(/
              key, index = key.to_s.split(/\(|i\)/)
              hash[key] ||= []
              hash[key][index.to_i - 1] = value.to_i
              multi_attributes << key
            else
              hash[key] = value
            end
            hash
          end

          # convert multiattribute values into date/time objects
          multi_attributes.each do |key|

            values = hash[key]

            hash[key] = case values.size
            when 0 then nil
            when 2
              now = Time.now
              Time.local(now.year, now.month, now.day, values[0], values[1], 0, 0)
            when 3 then Date.new(*values)
            else DateTime.new(*values)
            end

          end

          hash

        end

        private
        def type_cast attribute, raw
          if attribute.set?
            values = Record.as_array(raw).inject([]) do |values,value|
              values << attribute.type_cast(value)
              values
            end
            Set.new(values.compact)
          else
            attribute.type_cast(raw)
          end
        end

        private
        def serialize_attributes

          hash = {}
          self.class.attributes.each_pair do |attribute_name,attribute|
            value = serialize_attribute(attribute, @_data[attribute_name])
            unless [nil, []].include?(value)
              hash[attribute_name] = value
            end
          end

          # simple db does not support persisting items without attribute values
          raise EmptyRecordError.new(self) if hash.empty?

          hash

        end

        private
        def serialize_attribute attribute, raw_value
          type_casted_value = type_cast(attribute, raw_value)
          case type_casted_value
          when nil then nil
          when Set then type_casted_value.map{|v| attribute.serialize(v) }
          else attribute.serialize(type_casted_value)
          end
        end

        # @api private
        protected
        def hydrate id, data
          # New objects are populated with default values, but we don't
          # want these values to hang around when hydrating persisted values
          # (those values may have been blanked out before save).
          self.class.attributes.values.each do |attribute|
            @_data[attribute.name] = nil
          end

          ignore_changes do
            bulk_assign(deserialize_item_data(data))
          end

          @_persisted = true
        end

        protected
        def create_storage
          raise NotImplementedError
        end

        protected
        def update_storage
          raise NotImplementedError
        end

        protected
        def delete_storage
          raise NotImplementedError
        end

      end

      module ClassMethods

        # Allows you to override the default shard name for this class.
        # The shard name defaults to the class name.
        # @param [String] name
        def set_shard_name name
          @_shard_name = name
        end
        alias_method :set_domain_name, :set_shard_name
        alias_method :shard_name=, :set_shard_name

        # Returns the name of the shard this class will persist records
        # into by default.
        #
        # @param [String] name Defaults to the name of this class.
        # @return [String] Returns the full prefixed domain name for this class.
        def shard_name name = nil
          case name
          when nil
            @_shard_name || self.name
          when AWS::DynamoDB::Table
            name.name.gsub(/^#{Record::table_prefix}/, '')
          when AWS::SimpleDB::Domain
            name.name.gsub(/^#{Record::domain_prefix}/, '')
          else name
          end
        end
        alias_method :domain_name, :shard_name

        # Adds a scoped finder to this class.
        #
        #     class Book < AWS::Record::Model
        #       scope :top_10, order(:popularity, :desc).limit(10)
        #     end
        #
        #     Book.top_10.to_a
        #     #=> [#<Book...>, #<Book...>]
        #
        #     Book.top_10.first
        #     #=> #<Book...>
        #
        # You can also provide a block that accepts params for the scoped
        # finder.  This block should return a scope.
        #
        #     class Book < AWS::Record::Model
        #       scope :by_author, lambda {|name| where(:author => name) }
        #     end
        #
        #     # top 10 books by the author 'John Doe'
        #     Book.by_author('John Doe').top_10
        #
        # @param [Symbol] name The name of the scope.  Scope names should be
        #   method-safe and should not conflict with any other class methods.
        #
        # @param [Scope] scope
        #
        def scope name, scope = nil, &block

          method_definition = scope ? lambda { scope } : block

          extend(Module.new { define_method(name, &method_definition) })

        end

        # Creates an object (or multiple if you pass an array of attributes).
        # The {#save} method is called on the object(s) after construction.
        # The object(s) are returned wether or not the object(s) are valid.
        #
        #     class Book < AWS::Record::Model
        #       string_attr :title
        #     end
        #
        #     book = Book.create(:title => "The big book of tests")
        #     book.persisted?
        #     #=> true
        #
        #     books = Book.create([{:title => 'abc'}, {:title => 'xyz'}])
        #     books.each(&:persisted?)
        #     #=> [true, true]
        #
        def create attributes = {}
          create_impl(attributes, :create, :save)
        end

        # Creates an object (or multiple if you pass an array of attributes).
        # The {#save!} method is called on the object(s) after construction.
        # If the object(s) are not valid, then an error is raised.
        #
        #     class Book < AWS::Record::Model
        #       string_attr :title
        #       validates_presence_of :title
        #     end
        #
        #     book = Book.create!(:title => "The big book of tests")
        #     book.persisted?
        #     #=> true
        #
        #     book = Book.create!()
        #     #=> raises AWS::Record::InvalidRecordError
        #
        def create! attributes = {}
          create_impl(attributes, :create!, :save!)
        end

        # @api private
        def new_scope
          self::Scope.new(self)
        end

        def optimistic_locking attribute_name = :version_id
          attribute = integer_attr(attribute_name)
          @optimistic_locking_attr = attribute
        end

        # @return [Boolean] Returns true if this class is configured to
        #   perform optimistic locking.
        def optimistic_locking?
          !!@optimistic_locking_attr
        end

        # @private
        def optimistic_locking_attr
          @optimistic_locking_attr
        end

        # @return [Hash<String,Attribute>] Returns a hash of all of the
        #   configured attributes for this class.
        def attributes
          @attributes ||= {}
        end

        # @api private
        def attribute_for attribute_name, &block
          unless attribute = attributes[attribute_name.to_s]
            raise UndefinedAttributeError.new(attribute_name.to_s)
          end
          block_given? ? yield(attribute) : attribute
        end

        # @api private
        def add_attribute attribute

          attr_name = attribute.name

          attributes[attr_name] = attribute

          # setter
          define_method("#{attr_name}=") do |value|
            self[attr_name] = value
          end

          # getter
          define_method(attr_name) do
            self[attr_name]
          end

          # before type-cast getter
          define_method("#{attr_name}_before_type_cast") do
            @_data[attr_name]
          end

          # dirty tracking methods

          define_method("#{attr_name}_changed?") do
            attribute_changed?(attr_name)
          end

          define_method("#{attr_name}_change") do
            attribute_change(attr_name)
          end

          define_method("#{attr_name}_was") do
            attribute_was(attr_name)
          end

          define_method("#{attr_name}_will_change!") do
            attribute_will_change!(attr_name)
          end

          define_method("reset_#{attr_name}!") do
            reset_attribute!(attr_name)
          end

          attribute

        end

        # @api private
        def remove_attribute(attribute)
          send(:remove_method, attribute.name)
          send(:remove_method, "#{attribute.name}=")
          send(:remove_method, "#{attribute.name}_before_type_cast")
          send(:remove_method, "#{attribute.name}_changed?")
          send(:remove_method, "#{attribute.name}_change")
          send(:remove_method, "#{attribute.name}_was")
          send(:remove_method, "#{attribute.name}_will_change!")
          send(:remove_method, "reset_#{attribute.name}!")
          validators.each do |validator|
            validator.attribute_names.delete(attribute.name)
          end
          attributes.delete(attribute.name)
        end

        private

        def create_impl attributes = {}, create_method = :create, save_method = :save
          if attributes.is_a?(Array)
            attributes.map {|attr| send(create_method, attr) }
          else
            obj = new(attributes)
            obj.send(save_method)
            obj
          end
        end

      end
    end
  end
end
