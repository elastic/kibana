module Aws
  # @api private
  class Pager

    def initialize(rules)
      @more_results = rules['more_results']
      @more_results = underscore(@more_results) if @more_results
      if rules['limit_key']
        @limit_key = underscore(rules['limit_key']).to_sym
      end
      map_tokens(rules)
    end

    # @return [Symbol, nil]
    attr_reader :limit_key

    # @param [Seahorse::Client::Response] response
    # @return [Hash]
    def next_tokens(response)
      @tokens.each.with_object({}) do |(source, target), next_tokens|
        value = JMESPath.search(source, response.data)
        next_tokens[target.to_sym] = value unless empty_value?(value)
      end
    end

    # @api private
    def prev_tokens(response)
      @tokens.each.with_object({}) do |(_, target), tokens|
        value = JMESPath.search(target, response.context.params)
        tokens[target.to_sym] = value unless empty_value?(value)
      end
    end

    # @param [Seahorse::Client::Response] response
    # @return [Boolean]
    def truncated?(response)
      if @more_results
        JMESPath.search(@more_results, response.data)
      else
        next_tokens = self.next_tokens(response)
        prev_tokens = self.prev_tokens(response)
        !(next_tokens.empty? || next_tokens == prev_tokens)
      end
    end

    private

    def map_tokens(rules)
      input = Array(rules['input_token'])
      output = Array(rules['output_token'])
      @tokens = {}
      input.each.with_index do |key, n|
        @tokens[underscore(output[n])] = underscore(key)
      end
    end

    def underscore(str)
      str.
        gsub(' or ', '||').
        gsub(/\w+/) { |part| Seahorse::Util.underscore(part) }
    end

    def empty_value?(value)
      value.nil? || value == '' || value == [] || value == {}
    end

  end
end
