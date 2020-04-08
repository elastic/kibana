module I18n
  module HashRefinements
    refine Hash do
      using I18n::HashRefinements
      def except(*keys)
        dup.except!(*keys)
      end

      def except!(*keys)
        keys.each { |key| delete(key) }
        self
      end

      def deep_symbolize_keys
        each_with_object({}) do |(key, value), result|
          result[symbolize_key(key)] = deep_symbolize_keys_in_object(value)
          result
        end
      end

      # deep_merge_hash! by Stefan Rusterholz, see http://www.ruby-forum.com/topic/142809
      def deep_merge!(data)
        merger = lambda do |_key, v1, v2|
          Hash === v1 && Hash === v2 ? v1.merge(v2, &merger) : v2
        end
        merge!(data, &merger)
      end

      def symbolize_key(key)
        key.respond_to?(:to_sym) ? key.to_sym : key
      end

      private

      def deep_symbolize_keys_in_object(value)
        case value
        when Hash
          value.deep_symbolize_keys
        when Array
          value.map { |e| deep_symbolize_keys_in_object(e) }
        else
          value
        end
      end
    end
  end
end
