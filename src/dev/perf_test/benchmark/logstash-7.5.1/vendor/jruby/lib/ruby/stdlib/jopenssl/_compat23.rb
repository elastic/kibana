# frozen_string_literal: false

module OpenSSL

  module PKey

    class DH

      def set_key(pub_key, priv_key)
        self.pub_key = pub_key
        self.priv_key = priv_key
        self
      end

      def set_pqg(p, q, g)
        self.p = p
        if respond_to?(:q)
          self.q = q
        else # TODO self.q = q
          OpenSSL.warn "JRuby-OpenSSL does not support setting q param on #{inspect}" if q
        end
        self.g = g
        self
      end

    end

    class DSA

      def set_key(pub_key, priv_key)
        self.pub_key = pub_key
        self.priv_key = priv_key
        self
      end

      def set_pqg(p, q, g)
        self.p = p
        self.q = q
        self.g = g
        self
      end

    end

    class RSA

      def set_key(n, e, d)
        self.n = n
        self.e = e
        self.d = d
        self
      end

      def set_factors(p, q)
        self.p = p
        self.q = q
        self
      end

      def set_crt_params(dmp1, dmq1, iqmp)
        self.dmp1 = dmp1
        self.dmq1 = dmq1
        self.iqmp = iqmp
        self
      end

    end

  end

end
