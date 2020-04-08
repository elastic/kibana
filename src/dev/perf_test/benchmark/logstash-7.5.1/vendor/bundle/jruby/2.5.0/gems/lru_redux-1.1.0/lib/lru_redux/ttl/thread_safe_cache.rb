class LruRedux::TTL::ThreadSafeCache < LruRedux::TTL::Cache
  include LruRedux::Util::SafeSync
end
