class TTLThreadSafeCacheTest < TTLCacheTest
  def setup
    Timecop.freeze(Time.now)
    @c = LruRedux::TTL::ThreadSafeCache.new 3, 5 * 60
  end

  def test_recursion
    @c[:a] = 1
    @c[:b] = 2

    # should not blow up
    @c.each do |k, _|
      @c[k]
    end
  end
end