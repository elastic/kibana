module EDN
  module Metadata
    def self.extended(base)
      base.instance_eval do
        alias :to_edn_without_metadata :to_edn
        alias :to_edn :to_edn_with_metadata
      end
    end

    attr_accessor :metadata

    def has_metadata?
      respond_to?(:allows_metadata?) and
        allows_metadata? and
        !metadata.nil? and
        !metadata.empty?
    end

    def to_edn_with_metadata
      if has_metadata?
        '^' + metadata.to_edn + ' ' + to_edn_without_metadata
      else
        to_edn_without_metadata
      end
    end
  end
end
