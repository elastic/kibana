# frozen-string-literal: true

module Sequel 
  class Dataset
    module StoredProcedureMethods
      # The name of the stored procedure to call
      def sproc_name
        @opts[:sproc_name]
      end
      
      # Call the stored procedure with the given args
      def call(*args, &block)
        clone(:sproc_args=>args).run(&block)
      end

      # Programmer friendly string showing this is a stored procedure,
      # showing the name of the procedure.
      def inspect
        "<#{self.class.name}/StoredProcedure name=#{@sproc_name}>"
      end
      
      # Run the stored procedure with the current args on the database
      def run(&block)
        case @opts[:sproc_type]
        when :select, :all
          all(&block)
        when :first
          first
        when :insert
          insert
        when :update
          update
        when :delete
          delete
        end
      end
    end
  
    module StoredProcedures
      # For the given type (:select, :first, :insert, :update, or :delete),
      # run the database stored procedure with the given name with the given
      # arguments.
      def call_sproc(type, name, *args)
        prepare_sproc(type, name).call(*args)
      end
      
      # Transform this dataset into a stored procedure that you can call
      # multiple times with new arguments.
      def prepare_sproc(type, name)
        prepare_extend_sproc(self).clone(:sproc_type=>type, :sproc_name=>name, :sql=>'')
      end
      
      private
      
      # Extend the dataset with the stored procedure methods.
      def prepare_extend_sproc(ds)
        ds.with_extend(StoredProcedureMethods)
      end
    end
  end
end
