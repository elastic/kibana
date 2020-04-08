class LruRedux::ThreadSafeCache < LruRedux::Cache
  include LruRedux::Util::SafeSync
end
