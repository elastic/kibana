require 'backports/2.1.0/array/to_h' unless Array.method_defined? :to_h

if [[:need, true]].to_h { [:need, false] } [:need]
  require 'backports/tools/alias_method_chain'

  class Array
    def to_h_with_block(&block)
      receiver = block ? map(&block) : self
      receiver.to_h_without_block
    end
    Backports.alias_method_chain self, :to_h, :block
  end
end
