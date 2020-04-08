require 'backports/tools/alias_method_chain'

class Hash
  unless instance_method(:merge).arity < 0
    def merge_with_backports(first = {}, *others, &block)
      merge_without_backports(first, &block).
        merge!(*others, &block)
    end
    Backports.alias_method_chain self, :merge, :backports
  end

  unless instance_method(:merge!).arity < 0
    def merge_with_backports!(*hashes, &block)
      hashes.each do |h|
        merge_without_backports!(h, &block)
      end
      self
    end
    Backports.alias_method_chain self, :merge!, :backports
  end

  unless instance_method(:update).arity < 0
    require 'backports/tools/suppress_verbose_warnings'
    Backports.suppress_verbose_warnings do
      alias_method :update, :merge!
    end
  end
end
