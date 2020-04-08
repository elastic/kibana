module MurmurHash3
  module Alias32
    def self.included(base)
      base.send(:extend, base)
      class << base
        alias fmix murmur3_32_fmix
        alias str_hash murmur3_32_str_hash
        alias str_digest murmur3_32_str_digest
        alias str_hexdigest murmur3_32_str_hexdigest
        alias str_base64digest murmur3_32_str_base64digest
        alias int32_hash murmur3_32_int32_hash
        alias int64_hash murmur3_32_int64_hash
      end
    end
  end
  module Alias128
    def self.included(base)
      base.send(:extend, base)
      class << base
        alias fmix murmur3_128_fmix
        alias str_hash murmur3_128_str_hash
        alias str_digest murmur3_128_str_digest
        alias str_hexdigest murmur3_128_str_hexdigest
        alias str_base64digest murmur3_128_str_base64digest
        alias int32_hash murmur3_128_int32_hash
        alias int64_hash murmur3_128_int64_hash
      end
    end
  end
end
