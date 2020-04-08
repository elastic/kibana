require 'backports/2.1.0/enumerable/to_h' unless Enumerable.method_defined? :to_h

if Enumerable.instance_method(:to_h).bind([[:need, true]]).call { [:need, false] } [:need]
  require 'backports/tools/alias_method_chain'

  module Enumerable
    def to_h_with_block(*args, &block)
      return to_h_without_block(*args) unless block
      map(*args, &block).to_h_without_block
    end
    Backports.alias_method_chain self, :to_h, :block
  end
end
