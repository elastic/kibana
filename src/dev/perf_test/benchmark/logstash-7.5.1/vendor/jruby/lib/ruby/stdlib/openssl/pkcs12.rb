require 'java'

module OpenSSL
  class PKCS12
    class PKCS12Error < OpenSSLError
    end

    java_import 'org.jruby.ext.openssl.PEMUtils'
    java_import 'org.jruby.ext.openssl.SecurityHelper'

    def self.create(pass, name, key, cert, ca = nil)
      pkcs12 = self.new
      pkcs12.generate(pass, name, key, cert, ca)
      pkcs12
    end

    attr_reader :key, :certificate, :ca_certs

    def initialize(str = nil, password = '')
      return @der = nil unless str

      if str.is_a?(File)
        file = File.open(str.path, "rb")
        @der = file.read
        file.close
      else
        str.force_encoding(Encoding::ASCII_8BIT) if str.respond_to?(:force_encoding)
        @der = str
      end

      store = SecurityHelper.getKeyStore("PKCS12")
      store.load(java.io.ByteArrayInputStream.new(@der.to_java_bytes), password.to_java.to_char_array)

      aliases = store.aliases
      aliases.each do |alias_name|
        if store.is_key_entry(alias_name)
          if java_certificate = store.get_certificate(alias_name)
            der = String.from_java_bytes(java_certificate.get_encoded)
            @certificate = OpenSSL::X509::Certificate.new(der)
          end

          java_key = store.get_key(alias_name, password.to_java.to_char_array)
          if java_key
            der = String.from_java_bytes(java_key.get_encoded)
            algorithm = java_key.get_algorithm
            if algorithm == "RSA"
              @key = OpenSSL::PKey::RSA.new(der)
            elsif algorithm == "DSA"
              @key = OpenSSL::PKey::DSA.new(der)
            elsif algorithm == "DH"
              @key = OpenSSL::PKey::DH.new(der)
            elsif algorithm == "EC"
              @key = OpenSSL::PKey::EC.new(der)
            else
              raise PKCS12Error, "Unknown key algorithm #{algorithm}"
            end
          end

          @ca_certs = Array.new
          java_ca_certs = store.get_certificate_chain(alias_name)
          if java_ca_certs
            java_ca_certs.each do |java_ca_cert|
                der = String.from_java_bytes(java_ca_cert.get_encoded)
                ruby_cert = OpenSSL::X509::Certificate.new(der)
                if (ruby_cert.to_pem != @certificate.to_pem)
                  @ca_certs << ruby_cert
                end
            end
          end
          break
        end
      end
    rescue java.lang.Exception => e
      raise PKCS12Error, e.inspect
    end

    def generate(pass, alias_name, key, cert, ca = nil)
      @key, @certificate, @ca_certs = key, cert, ca

      certificates = cert.to_pem
      ca.each { |ca_cert| certificates << ca_cert.to_pem } if ca

      begin
        der_bytes = PEMUtils.generatePKCS12(
          java.io.StringReader.new(key.to_pem), certificates.to_java_bytes,
          alias_name, ( pass.nil? ? "" : pass ).to_java.to_char_array
        )
      rescue java.security.KeyStoreException, java.security.cert.CertificateException => e
        raise PKCS12Error, e.message
      rescue java.security.GeneralSecurityException, java.io.IOException => e
        raise PKCS12Error, e.inspect
      end

      @der = String.from_java_bytes(der_bytes)
    end

    def to_der
      @der
    end
  end
end
