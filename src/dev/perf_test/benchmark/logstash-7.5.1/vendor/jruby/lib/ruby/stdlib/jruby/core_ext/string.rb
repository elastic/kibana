
class String
  
  # Construct a new string with a buffer of the specified size. The buffer is
  # filled with null bytes to start.
  # 
  # May be useful in cases where you know how large a string will grow, and want
  # to pre-allocate the buffer for that size.
  #
  # @return [String]
  # @deprecated use `String.new(capacity: size)`
  def self.alloc(size)
    new(capacity: size)
  end if false

  # Hashed in Ruby are seeded by default (might not be the same between runs).
  # The unseeded hash returns a 'raw' value based only on the byte content.
  # @return [Integer] raw unseeded hash for the String
  def unseeded_hash; end if false

end

JRuby::Util.load_ext(:string)
