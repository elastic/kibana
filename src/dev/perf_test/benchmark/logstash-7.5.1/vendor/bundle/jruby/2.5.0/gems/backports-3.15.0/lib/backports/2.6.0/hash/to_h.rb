require 'backports/2.0.0/hash/to_h' unless Hash.method_defined? :to_h

if {:n => true}.to_h{[:ok, true]}[:n]
  require 'backports/tools/alias_method_chain'
  require 'backports/2.1.0/array/to_h'

  class Hash
    def to_h_with_block(&block)
      return to_h_without_block unless block
      map(&block).to_h
    end
    Backports.alias_method_chain self, :to_h, :block
  end
end
