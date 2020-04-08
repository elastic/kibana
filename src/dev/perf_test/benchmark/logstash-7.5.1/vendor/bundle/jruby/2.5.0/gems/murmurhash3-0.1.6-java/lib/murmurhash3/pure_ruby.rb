require 'murmurhash3/aliaser'
module MurmurHash3
  module PureRuby32
    MASK32 = 0xffffffff
    def murmur3_32_rotl(x, r)
      ((x << r) | (x >> (32 - r))) & MASK32
    end


    def murmur3_32_fmix(h)
      h &= MASK32
      h ^= h >> 16
      h = (h * 0x85ebca6b) & MASK32
      h ^= h >> 13
      h = (h * 0xc2b2ae35) & MASK32
      h ^ (h >> 16)
    end
    
    def murmur3_32__mmix(k1)
      k1 = (k1 * 0xcc9e2d51) & MASK32
      k1 = murmur3_32_rotl(k1, 15)
      (k1 * 0x1b873593) & MASK32
    end

    def murmur3_32_str_hash(str, seed=0)
      h1 = seed
      numbers = str.unpack('V*C*')
      tailn = str.bytesize % 4
      tail = numbers.slice!(numbers.size - tailn, tailn)
      for k1 in numbers
        h1 ^= murmur3_32__mmix(k1)
        h1 = murmur3_32_rotl(h1, 13)
        h1 = (h1*5 + 0xe6546b64) & MASK32
      end

      unless tail.empty?
        k1 = 0
        tail.reverse_each do |c1|
          k1 = (k1 << 8) | c1
        end
        h1 ^= murmur3_32__mmix(k1)
      end

      h1 ^= str.bytesize
      murmur3_32_fmix(h1)
    end

    def murmur3_32_int32_hash(i, seed=0)
      str_hash([i].pack("V"), seed)
    end

    def murmur3_32_int64_hash(i, seed=0)
      str_hash([i].pack("Q<"), seed)
    end

    def murmur3_32_str_digest(str, seed=0)
      [str_hash(str, seed)].pack("V")
    end

    def murmur3_32_str_hexdigest(str, seed=0)
      [str_hash(str, seed)].pack("V").unpack("H*")[0]
    end

    def murmur3_32_str_base64digest(str, seed=0)
      [[str_hash(str, seed)].pack("V")].pack("m").chomp!
    end
    include MurmurHash3::Alias32
  end

  module PureRuby128
    MASK64 = 0xffff_ffff_ffff_ffff

    def murmur3_128_rotl(x, r)
      ((x << r) | (x >> (64 - r))) & MASK64
    end

    def murmur3_128_fmix(h)
      h &= MASK64
      h ^= h >> 33
      h = (h * 0xff51afd7_ed558ccd) & MASK64
      h ^= h >> 33
      h = (h * 0xc4ceb9fe_1a85ec53) & MASK64
      h ^ (h >> 33)
    end

    C1_128 = 0x87c37b91_114253d5
    C2_128 = 0x4cf5ad43_2745937f
    def murmur3_128__mmix1(k1)
      k1 = (k1 * C1_128) & MASK64
      k1 = murmur3_128_rotl(k1, 31)
      (k1 * C2_128) & MASK64
    end

    def murmur3_128__mmix2(k2)
      k2 = (k2 * C2_128) & MASK64
      k2 = murmur3_128_rotl(k2, 33)
      (k2 * C1_128) & MASK64
    end

    def murmur3_128_str_hash(str, seed=0)
      h1 = h2 = seed
      fast_part = ((str.bytesize / 16) * 16)
      numbers = str.byteslice(0, fast_part).unpack('Q<*')
      tail = str.byteslice(fast_part, str.bytesize - fast_part).unpack('C*')

      numbers.each_slice(2) do |k1, k2|
        h1 ^= murmur3_128__mmix1(k1)
        h1 = murmur3_128_rotl(h1, 27)
        h1 = (h1 + h2) & MASK64
        h1 = (h1*5 + 0x52dce729) & MASK64
        h2 ^= murmur3_128__mmix2(k2)
        h2 = murmur3_128_rotl(h2, 31)
        h2 = (h1 + h2) & MASK64
        h2 = (h2*5 + 0x38495ab5) & MASK64
      end

      unless tail.empty?
        if tail.size > 8
          k2 = 0
          tail[8,8].reverse_each do |c2|
            k2 = (k2 << 8) | c2
          end
          h2 ^= murmur3_128__mmix2(k2)
        end
        k1 = 0
        tail[0,8].reverse_each do |c1|
          k1 = (k1 << 8) | c1
        end
        h1 ^= murmur3_128__mmix1(k1)
      end

      h1 ^= str.bytesize
      h2 ^= str.bytesize
      h1 = (h1 + h2) & MASK64
      h2 = (h1 + h2) & MASK64
      h1 = murmur3_128_fmix(h1)
      h2 = murmur3_128_fmix(h2)

      h1 = (h1 + h2) & MASK64
      h2 = (h1 + h2) & MASK64
      [h1 & 0xffffffff, h1 >> 32, h2 & 0xffffffff, h2 >> 32]
    end

    def murmur3_128_int32_hash(i, seed=0)
      str_hash([i].pack("V"), seed)
    end

    def murmur3_128_int64_hash(i, seed=0)
      str_hash([i].pack("Q<"), seed)
    end

    def murmur3_128_str_digest(str, seed=0)
      str_hash(str, seed).pack("V4")
    end

    def murmur3_128_str_hexdigest(str, seed=0)
      str_hash(str, seed).pack("V4").unpack("H*")[0]
    end

    def murmur3_128_str_base64digest(str, seed=0)
      [str_hash(str, seed).pack("V4")].pack('m').chomp!
    end
    include MurmurHash3::Alias128
  end
end
