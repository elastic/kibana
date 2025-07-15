# Kibana Lock Manager

A simple, distributed lock manager built on top of Elasticsearch.  
Ensures that only one process at a time can hold a named lock, with automatic lease renewal and token fencing for safe release.

### Typical scenarios

**Re-indexing**
Starting multiple re-index operation on the same source simultaneously can lead to data corruption. Wrapping the re-index call in `withLock("my_reindex")` guarantees that only one consumer can start the operation.

**Bootstrapping tasks**
On Kibana startup you might need to run migrations, create/update index mappings or bootstrapping other types of assets. Without a lock, every Kibana node that boots in parallel will try to run the same migrations. A lock ensures that the startup migrations only run exactly once, even if multiple Kibana nodes spin up concurrently.
  
# API Documentation

## `withLock<T>(lockId, callback, options)`

Acquires a lock and executes the provided callback. If the lock is already held by another process, the method will throw a `LockAcquisitionError` and the callback will not be executed. When the callback returns the lock is released.

### Parameters

- **`lockId`** (`string`): Unique identifier for the lock

- **`callback`** (`() => Promise<T>`): Asynchronous function to execute once the lock is acquired. This function will be executed only if the lock acquisition succeeds.

- **`options`** (`object`, optional): Additional configuration options.
  - **`metadata`** (`Record<string, any>`, optional): Custom metadata to store with the lock. 

## Example

```ts
import { LockManagerService, LockAcquisitionError } from '@kbn/lock-manager';


async function reIndexWithLock() {
  // Attempt to acquire "my_lock"; if successful, runs the callback.
  const lmService = new LockManagerService(coreSetup, logger);
  return lmService.withLock('my_lock', async () => {
    // …perform your exclusive operation here…
  });
}

reIndexWithLock().catch((err) => {
  if (err instanceof LockAcquisitionError) {
    logger.debug('Re-index already in progress, skipping.');
    return;
  }
  logger.error(`Failed to re-index: ${err.message}`);
});
```

## How It Works
**Atomic Acquire**
Performs one atomic Elasticsearch update that creates a new lock or renews an existing one - so if multiple processes race for the same lock, only one succeeds.

**TTL-Based Lease**
Each lock has a short, fixed lifespan (default 30s) and will automatically expire if not renewed. While the callback is executing, the lock will automatically extend the TTL to keep the lock active. This safeguards against deadlocks because if a Kibana node crashes after having obtained a lock it will automatically be released after 30 seconds.

Note: If Kibana node crashes, another process could acquire the same lock and start that task again when the lock automatically expires. To prevent your operation from running multiple times, include an application-level check (for example, querying Elasticsearch or your own status flag) to verify the operation isn’t already in progress before proceeding.

**Token Fencing**
Each lock operation carries a unique token. Only the process with the matching token can extend or release the lock, preventing stale holders from interfering.
