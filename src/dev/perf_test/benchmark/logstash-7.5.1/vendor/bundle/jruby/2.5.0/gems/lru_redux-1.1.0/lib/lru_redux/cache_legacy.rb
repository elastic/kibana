# Ruby 1.9 makes our life easier, Hash is already ordered
#
# This is an ultra efficient 1.9 freindly implementation
class LruRedux::Cache
  def max_size=(size)
    raise ArgumentError.new(:max_size) if @max_size < 1
    @max_size = size
    if @max_size < @data.size
      @data.keys[0..@max_size-@data.size].each do |k|
        @data.delete(k)
      end
    end
  end

  def getset(key)
    found = true
    value = @data.delete(key){ found = false }
    if found
      @data[key] = value
    else
      result = @data[key] = yield
      # this may seem odd see: http://bugs.ruby-lang.org/issues/8312
      @data.delete(@data.first[0]) if @data.length > @max_size
      result
    end
  end

  def []=(key,val)
    @data.delete(key)
    @data[key] = val
    # this may seem odd see: http://bugs.ruby-lang.org/issues/8312
    @data.delete(@data.first[0]) if @data.length > @max_size
    val
  end

  # for cache validation only, ensures all is sound
  def valid?
    true
  end
end
