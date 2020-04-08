# frozen-string-literal: true

module Sequel
  class Model
    # Errors represents validation errors, a simple hash subclass
    # with a few convenience methods.
    class Errors < ::Hash
      # Adds an error for the given attribute.
      #
      #   errors.add(:name, 'is not valid') if name == 'invalid'
      def add(att, msg)
        fetch(att){self[att] = []} << msg
      end

      # Return the total number of error messages.
      #
      #   errors.count # => 3
      def count
        values.inject(0){|m, v| m + v.length}
      end
       
      # Return true if there are no error messages, false otherwise.
      def empty?
        count == 0
      end
      
      # Returns an array of fully-formatted error messages.
      #
      #   errors.full_messages
      #   # => ['name is not valid',
      #   #     'hometown is not at least 2 letters']
      #
      # If the message is a Sequel::LiteralString, it will be used literally, without the column name:
      #
      #   errors.add(:name, Sequel.lit("Album name is not valid"))
      #   errors.full_messages
      #   # => ['Album name is not valid']
      def full_messages
        inject([]) do |m, kv| 
          att, errors = *kv
          errors.each {|e| m << (e.is_a?(LiteralString) ? e : "#{Array(att).join(' and ')} #{e}")}
          m
        end
      end
      
      # Returns the array of errors for the given attribute, or nil
      # if there are no errors for the attribute.
      #
      #   errors.on(:name) # => ['name is not valid']
      #   errors.on(:id) # => nil
      def on(att)
        if v = fetch(att, nil) and !v.empty?
          v
        end
      end
    end
  end
end
