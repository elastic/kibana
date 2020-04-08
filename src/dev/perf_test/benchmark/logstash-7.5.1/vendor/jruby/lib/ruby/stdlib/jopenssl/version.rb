module JOpenSSL
  VERSION = '0.10.2'
  BOUNCY_CASTLE_VERSION = '1.61'
end

Object.class_eval do
  Jopenssl = JOpenSSL
  private_constant :Jopenssl if respond_to?(:private_constant)
end