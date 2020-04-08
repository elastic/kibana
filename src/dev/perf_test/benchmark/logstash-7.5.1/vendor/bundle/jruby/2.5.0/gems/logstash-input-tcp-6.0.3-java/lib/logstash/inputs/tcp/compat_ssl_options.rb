require 'openssl'

java_import 'io.netty.handler.ssl.ClientAuth'
java_import 'io.netty.handler.ssl.SslContextBuilder'
java_import 'java.io.FileInputStream'
java_import 'java.io.FileReader'
java_import 'java.security.cert.CertificateFactory'
java_import 'java.security.cert.X509Certificate'
java_import 'org.bouncycastle.asn1.pkcs.PrivateKeyInfo'
java_import 'org.bouncycastle.jce.provider.BouncyCastleProvider'
java_import 'org.bouncycastle.openssl.PEMKeyPair'
java_import 'org.bouncycastle.openssl.PEMParser'
java_import 'org.bouncycastle.openssl.PEMEncryptedKeyPair'
java_import 'org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter'
java_import 'org.bouncycastle.openssl.jcajce.JcePEMDecryptorProviderBuilder'
java_import 'org.bouncycastle.openssl.jcajce.JceOpenSSLPKCS8DecryptorProviderBuilder'
java_import 'org.bouncycastle.pkcs.PKCS8EncryptedPrivateKeyInfo'


# Simulate a normal SslOptions builder:
#
#     ssl_context = SslOptions.builder
#       .set_is_ssl_enabled(@ssl_enable)
#       .set_should_verify(@ssl_verify)
#       .set_ssl_cert(@ssl_cert)
#       .set_ssl_key(@ssl_key)
#       .set_ssl_key_passphrase(@ssl_key_passphrase.value)
#       .set_ssl_extra_chain_certs(@ssl_extra_chain_certs.to_java(:string))
#       .set_ssl_certificate_authorities(@ssl_certificate_authorities.to_java(:string))
#       .build.toSslContext()
class SslOptions
  def self.builder
    new
  end

  def set_is_ssl_enabled(boolean)
    @ssl_enabled = boolean
    self
  end

  def set_should_verify(boolean)
    @ssl_verify = boolean
    self
  end

  def set_ssl_cert(path)
    @ssl_cert_path = path
    self
  end

  def set_ssl_key(path)
    @ssl_key_path = path
    self
  end

  def set_ssl_key_passphrase(passphrase)
    @ssl_key_passphrase = passphrase
    self
  end

  def set_ssl_extra_chain_certs(certs)
    @ssl_extra_chain_certs = certs
    self
  end

  def set_ssl_certificate_authorities(certs)
    @ssl_certificate_authorities = certs
    self
  end

  def build; self; end

  def toSslContext
    return nil unless @ssl_enabled

    # create certificate object
    cf = CertificateFactory.getInstance("X.509")
    cert_chain = []
    fetch_certificates_from_file(@ssl_cert_path, cf) do |cert|
      cert_chain << cert
    end

    # convert key from pkcs1 to pkcs8 and get PrivateKey object
    pem_parser = PEMParser.new(FileReader.new(@ssl_key_path))
    java.security.Security.addProvider(BouncyCastleProvider.new)
    converter = JcaPEMKeyConverter.new
    case obj = pem_parser.readObject
    when PEMKeyPair # unencrypted pkcs#1
      private_key = converter.getKeyPair(obj).private
    when PrivateKeyInfo # unencrypted pkcs#8
      private_key = converter.getPrivateKey(obj)
    when PEMEncryptedKeyPair # encrypted pkcs#1
      key_char_array = @ssl_key_passphrase.to_java.toCharArray
      decryptor = JcePEMDecryptorProviderBuilder.new.build(key_char_array)
      key_pair = obj.decryptKeyPair(decryptor)
      private_key = converter.getKeyPair(key_pair).private
    when PKCS8EncryptedPrivateKeyInfo # encrypted pkcs#8
      key_char_array = @ssl_key_passphrase.to_java.toCharArray
      key = JceOpenSSLPKCS8DecryptorProviderBuilder.new.build(key_char_array)
      private_key = converter.getPrivateKey(obj.decryptPrivateKeyInfo(key))
    else
      raise "Could not recognize 'ssl_key' format. Class: #{obj.class}"
    end

    @ssl_extra_chain_certs.each do |file|
      fetch_certificates_from_file(file, cf) do |cert|
        cert_chain << cert
      end
    end
    sslContextBuilder = SslContextBuilder.forServer(private_key, @ssl_key_passphrase, cert_chain.to_java(X509Certificate))

    trust_certs = []

    @ssl_certificate_authorities.each do |file|
      fetch_certificates_from_file(file, cf) do |cert|
        trust_certs << cert
      end
    end

    if trust_certs.any?
      sslContextBuilder.trustManager(trust_certs.to_java(X509Certificate))
    end

    sslContextBuilder.clientAuth(@ssl_verify ? ClientAuth::REQUIRE : ClientAuth::NONE)
    sslContextBuilder.build()
  end

  private
  def fetch_certificates_from_file(file, cf)
    fis = java.io.FileInputStream.new(file)

    while (fis.available > 0) do
      cert = generate_certificate(cf, fis)
      yield cert if cert
    end
  ensure
    fis.close if fis
  end

  def generate_certificate(cf, fis)
    cf.generateCertificate(fis)
  rescue Java::JavaSecurityCert::CertificateException => e
    raise e unless e.cause.message == "Empty input"
  end
end
