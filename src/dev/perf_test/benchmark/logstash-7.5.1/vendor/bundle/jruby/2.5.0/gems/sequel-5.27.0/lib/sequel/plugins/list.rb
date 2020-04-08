# frozen-string-literal: true

module Sequel
  module Plugins
    # The list plugin allows for model instances to be part of an ordered list,
    # based on a position field in the database.  It can either consider all
    # rows in the table as being from the same list, or you can specify scopes
    # so that multiple lists can be kept in the same table.
    # 
    # Basic Example:
    #
    #   class Item < Sequel::Model(:items)
    #     plugin :list # will use :position field for position
    #     plugin :list, field: :pos # will use :pos field for position
    #   end
    #   
    #   item = Item[1]
    # 
    #   # Get the next or previous item in the list
    # 
    #   item.next
    #   item.prev
    # 
    #   # Modify the item's position, which may require modifying other items in
    #   # the same list
    # 
    #   item.move_to(3)
    #   item.move_to_top
    #   item.move_to_bottom
    #   item.move_up
    #   item.move_down
    # 
    # You can provide a <tt>:scope</tt> option to scope the list.  This option
    # can be a symbol or array of symbols specifying column name(s), or a proc
    # that accepts a model instance and returns a dataset representing the list
    # the object is in.
    # 
    # For example, if each item has a +user_id+ field, and you want every user
    # to have their own list:
    #
    #   Item.plugin :list, scope: :user_id
    # 
    # Note that using this plugin modifies the order of the model's dataset to
    # sort by the position and scope fields.  Also note that this plugin is subject to
    # race conditions, and is not safe when concurrent modifications are made
    # to the same list.
    #
    # Note that by default, unlike ruby arrays, the list plugin assumes the first
    # entry in the list has position 1, not position 0.
    #
    # You can change this by providing an integer <tt>:top</tt> option:
    #
    #   Item.plugin :list, top: 0
    #
    # Copyright (c) 2007-2010 Sharon Rosner, Wayne E. Seguin, Aman Gupta, Adrian Madrid, Jeremy Evans
    module List
      # Set the +position_field+, +scope_proc+ and +top_of_list+ attributes for the model,
      # using the <tt>:field</tt>, <tt>:scope</tt>, and <tt>:top</tt> options, respectively.
      # The <tt>:scope</tt> option can be a symbol, array of symbols, or a proc that
      # accepts a model instance and returns a dataset representing the list.
      # Also, modify the model dataset's order to order by the position and scope fields.
      def self.configure(model, opts = OPTS)
        model.position_field = opts[:field] || :position
        model.dataset = model.dataset.order_prepend(model.position_field)
        model.instance_exec do
          @top_of_list = opts[:top] || 1
        end
        
        model.scope_proc = case scope = opts[:scope]
        when Symbol
          model.dataset = model.dataset.order_prepend(scope)
          proc{|obj| obj.model.where(scope=>obj.public_send(scope))}
        when Array
          model.dataset = model.dataset.order_prepend(*scope)
          proc{|obj| obj.model.where(scope.map{|s| [s, obj.get_column_value(s)]})}
        else
          scope
        end
      end

      module ClassMethods
        # The column name holding the position in the list, as a symbol.
        attr_accessor :position_field

        # A proc that scopes the dataset, so that there can be multiple positions 
        # in the list, but the positions are unique with the scoped dataset. This
        # proc should accept an instance and return a dataset representing the list.
        attr_accessor :scope_proc

        # An Integer to use as the position of the top of the list. Defaults to 1.
        attr_reader :top_of_list

        Plugins.inherited_instance_variables(self, :@position_field=>nil, :@scope_proc=>nil, :@top_of_list=>nil)
      end

      module InstanceMethods
        # The model object at the given position in the list containing this instance.
        def at_position(p)
          list_dataset.first(position_field => p)
        end

        # When destroying an instance, move all entries after the instance down
        # one position, so that there aren't any gaps
        def after_destroy
          super

          f = Sequel[position_field]
          list_dataset.where(f > position_value).update(f => f - 1)
        end

        # Find the last position in the list containing this instance.
        def last_position
          list_dataset.max(position_field).to_i
        end

        # A dataset that represents the list containing this instance.
        def list_dataset
          model.scope_proc ? model.scope_proc.call(self) : model.dataset
        end

        # Move this instance down the given number of places in the list,
        # or 1 place if no argument is specified.
        def move_down(n = 1)
          move_to(position_value + n)
        end

        # Move this instance to the given place in the list.  If lp is not
        # given or greater than the last list position, uses the last list
        # position.  If lp is less than the top list position, uses the
        # top list position.
        def move_to(target, lp = nil)
          current = position_value
          if target != current
            checked_transaction do
              ds = list_dataset
              op, ds = if target < current
                target = model.top_of_list if target < model.top_of_list
                [:+, ds.where(position_field=>target...current)]
              else
                lp ||= last_position
                target = lp if target > lp
                [:-, ds.where(position_field=>(current + 1)..target)]
              end
              ds.update(position_field => Sequel::SQL::NumericExpression.new(op, position_field, 1))
              update(position_field => target)
            end
          end
          self
        end

        # Move this instance to the bottom (last position) of the list.
        def move_to_bottom
          lp = last_position 
          move_to(lp, lp)
        end

        # Move this instance to the top (first position, usually position 1) of the list.
        def move_to_top
          move_to(model.top_of_list)
        end

        # Move this instance the given number of places up in the list, or 1 place
        # if no argument is specified.
        def move_up(n = 1)
          move_to(position_value - n) 
        end

        # The model instance the given number of places below this model instance
        # in the list, or 1 place below if no argument is given.
        def next(n = 1)
          n == 0 ? self : at_position(position_value + n)
        end

        # The value of the model's position field for this instance.
        def position_value
          get_column_value(position_field)
        end

        # The model instance the given number of places below this model instance
        # in the list, or 1 place below if no argument is given.
        def prev(n = 1)
          self.next(n * -1)
        end

        # Set the value of the position_field to the maximum value plus 1 unless the
        # position field already has a value.
        def before_validation
          unless get_column_value(position_field)
            set_column_value("#{position_field}=", list_dataset.max(position_field).to_i+1)
          end
          super
        end

        private

        # The model's position field, an instance method for ease of use.
        def position_field
          model.position_field
        end
      end
    end
  end
end
