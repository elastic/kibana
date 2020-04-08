# frozen-string-literal: true

module Sequel
  class Dataset
    # This Module subclass is used by Database#extend_datasets
    # and Dataset#with_extend to add dataset methods to classes.
    # It adds some helper methods inside the module that can define
    # named methods on the dataset instances which do specific actions.
    # For example:
    #
    #   DB.extend_datasets do
    #     order :by_id, :id
    #     select :with_id_and_name, :id, :name
    #     where :active, :active
    #   end
    #
    #   DB[:table].active.with_id_and_name.by_id
    #   # SELECT id, name FROM table WHERE active ORDER BY id
    class DatasetModule < ::Module
      meths = (<<-METHS).split.map(&:to_sym)
        where exclude exclude_having having
        distinct grep group group_and_count group_append 
        limit offset order order_append order_prepend reverse 
        select select_all select_append select_group server
      METHS

      # Define a method in the module
      def self.def_dataset_caching_method(mod, meth)
        mod.send(:define_method, meth) do |name, *args, &block|
          if block
            define_method(name){public_send(meth, *args, &block)}
          else
            key = :"_#{meth}_#{name}_ds"
            define_method(name) do
              cached_dataset(key){public_send(meth, *args)}
            end
          end
        end
      end

      meths.each do |meth|
        def_dataset_caching_method(self, meth)
      end
    end
  end
end
