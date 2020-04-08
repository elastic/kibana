# encoding: utf-8
# frozen_string_literal: true
module Mail
  module Encodings
    class TransferEncoding
      NAME = ''

      PRIORITY = -1

      def self.can_transport?(enc)
        enc = Encodings.get_name(enc)
        if Encodings.defined? enc
          Encodings.get_encoding(enc).new.is_a? self
        else
          false
        end
      end

      def self.can_encode?(enc)
        can_transport? enc 
      end

      def self.cost(str)
        raise "Unimplemented"
      end

      def self.compatible_input?(str)
        true
      end

      def self.to_s
        self::NAME
      end

      def self.get_best_compatible(source_encoding, str)
        if self.can_transport?(source_encoding) && self.compatible_input?(str)
          source_encoding
        else
          choices = Encodings.get_all.select do |enc|
            self.can_transport?(enc) && enc.can_encode?(source_encoding)
          end

          best = nil
          best_cost = nil

          choices.each do |enc|
            # If the current choice cannot be transported safely,
            # give priority to other choices but allow it to be used as a fallback.
            this_cost = enc.cost(str) if enc.compatible_input?(str)

            if !best_cost || (this_cost && this_cost < best_cost)
              best_cost = this_cost
              best = enc
            elsif this_cost == best_cost
              best = enc if enc::PRIORITY < best::PRIORITY
            end
          end

          best
        end
      end

      def to_s
        self.class.to_s
      end
    end
  end
end
