# @kbn/cache-cli

Centralised caching helpers for scripts and CLIs in the Kibana repo.

The goal is to make it easy for engineers to cache computationally or I/O expensive operations on disk, or in the future, possible remote.

---

## Quick start

```ts
import { fromCache, createLocalDirDiskCacheStore } from '@kbn/cache-cli';
import { createCache } from 'cache-manager';

const DOC_CACHE = createCache({
  stores: [createLocalDirDiskCacheStore({ dir: 'my_docs', ttl: 60 * 60 /* 1h */ })],
});

const docs = await fromCache('docs', DOC_CACHE, async () => fetchDocs());
```

`fromCache(key, cache, cb, validator?)` semantics:

1. Tries `cache.get(key)` (skipped when `process.env.DISABLE_KBN_CACHE` is truthy).
2. Runs the optional `validator(cached)` – return `false` to force a refresh.
3. Calls `cb()` if the cache miss / invalid.
4. Persists the fresh value via `cache.set(key, value)` and returns it.

---

## Available cache stores

`@kbn/cache-cli` wraps [`cache-manager`](https://github.com/node-cache-manager/node-cache-manager) so any **Keyv compatible** store works. The helpers below ship out-of-the-box:

| Helper                                        | Backing store                                       | Typical use-case                                           |
| --------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `createLocalDirDiskCacheStore({ dir, ttl? })` | `cache-manager-fs-hash` on `<REPO_ROOT>/data/{dir}` | Persist in `./data` with an unknown ttl                    |
| `createTmpDirDiskCacheStore({ dir, ttl? })`   | `cache-manager-fs-hash` on `<OS_TMP_DIR>/{dir}`     | Persist in os tmp dir which might be cleared over restarts |

---

## Cache invalidation strategies

1. **Manual bypass** – set `DISABLE_KBN_CACHE=true` to force fresh data (useful in CI workflows).
2. **Time-to-live (TTL)** – pass `ttl` when creating a store to let the backend expire entries automatically.
3. **Programmatic validation** – supply the `cacheValidator` callback to `fromCache()`; it receives the cached value and should return `true` when it is still valid.
4. **Clear on disk** – delete the relevant directory under `data/` if you need a hard reset.

Choose whichever fits your script. They can be combined (e.g. a TTL plus a validator).
