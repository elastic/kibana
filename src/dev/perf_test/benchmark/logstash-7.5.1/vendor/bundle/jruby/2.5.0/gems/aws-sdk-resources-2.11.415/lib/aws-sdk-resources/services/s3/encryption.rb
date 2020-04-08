module Aws
  module S3
    module Encryption

      autoload :Client, 'aws-sdk-resources/services/s3/encryption/client'
      autoload :DecryptHandler, 'aws-sdk-resources/services/s3/encryption/decrypt_handler'
      autoload :DefaultCipherProvider, 'aws-sdk-resources/services/s3/encryption/default_cipher_provider'
      autoload :DefaultKeyProvider, 'aws-sdk-resources/services/s3/encryption/default_key_provider'
      autoload :EncryptHandler, 'aws-sdk-resources/services/s3/encryption/encrypt_handler'
      autoload :Errors, 'aws-sdk-resources/services/s3/encryption/errors'
      autoload :IOEncrypter, 'aws-sdk-resources/services/s3/encryption/io_encrypter'
      autoload :IOAuthDecrypter, 'aws-sdk-resources/services/s3/encryption/io_auth_decrypter'
      autoload :IODecrypter, 'aws-sdk-resources/services/s3/encryption/io_decrypter'
      autoload :KeyProvider, 'aws-sdk-resources/services/s3/encryption/key_provider'
      autoload :KmsCipherProvider, 'aws-sdk-resources/services/s3/encryption/kms_cipher_provider'
      autoload :Materials, 'aws-sdk-resources/services/s3/encryption/materials'
      autoload :Utils, 'aws-sdk-resources/services/s3/encryption/utils'

    end
  end
end
