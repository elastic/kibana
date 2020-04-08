# encoding: utf-8
module LogStash::Util::UnicodeTrimmer
  # The largest possible unicode chars are 4 bytes
  # http://stackoverflow.com/questions/9533258/what-is-the-maximum-number-of-bytes-for-a-utf-8-encoded-character
  # http://tools.ietf.org/html/rfc3629
  MAX_CHAR_BYTES = 4

  # Takes a unicode string and makes sure it fits in a max of `desired_bytes`
  # This aims to be somewhat efficient about this for the average case and get as close to
  # O(1) as possible. Given certain distributions of multi-byte characters it'll be slower
  # It tries to find the point the truncation *should* happen based on the average byte size.
  # If that snips it in the wrong place it'll try to add or remove chars to get it to the right
  # spot and preserve as much data as possible.
  public
  def self.trim_bytes(orig_str, desired_bytes)
    return orig_str if orig_str.bytesize <= desired_bytes

    pre_shortened = pre_shorten(orig_str, desired_bytes)

    case pre_shortened.bytesize <=> desired_bytes
    when 0
      pre_shortened
    when 1
      shrink_bytes(pre_shortened, orig_str, desired_bytes)
    when -1
      grow_bytes(pre_shortened, orig_str, desired_bytes)
    end
  end

  private
  # Try to cut the string at the right place based on the avg. byte size
  def self.pre_shorten(orig_str, desired_bytes)
    # Compute the average size to get an idea of where should chop
    orig_len = orig_str.length
    orig_bs = orig_str.bytesize
    avg_size = (orig_bs.to_f / orig_len.to_f)

    # Try to do an initial shortening based on the average char size
    # The goal here is to get us somewhere above or below the boundary quickly
    orig_extra_bytes = orig_bs - desired_bytes
    pre_shorten_by = (orig_extra_bytes  / avg_size).to_i
    orig_str.slice(0, orig_len - pre_shorten_by)
  end

  private
  def self.grow_bytes(pre_shortened, orig_str, desired_bytes)
    res_str = pre_shortened.clone()

    loop do
      bs = res_str.bytesize
      deficit = desired_bytes - bs
      lengthen_by = deficit / MAX_CHAR_BYTES
      lengthen_by = 1 if lengthen_by < 1
      append = orig_str.slice(res_str.length, lengthen_by)

      break if (bs + append.bytesize) > desired_bytes

      res_str << append
    end

    res_str
  end

  private
  def self.shrink_bytes(pre_shortened, orig_str, desired_bytes)
    res_str = pre_shortened.clone()

    loop do
      bs = res_str.bytesize
      break if bs <= desired_bytes

      extra = bs - desired_bytes
      shorten_by = extra / MAX_CHAR_BYTES
      shorten_by = 1 if shorten_by < 1

      res_str.slice!(res_str.length - shorten_by)
    end

    res_str
  end
end
