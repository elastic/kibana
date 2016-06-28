![catbox Logo](https://raw.github.com/hapijs/catbox/master/images/catbox.png)

Multi-strategy object caching service
Version: **4.x**

[![Build Status](https://secure.travis-ci.org/hapijs/catbox.png)](http://travis-ci.org/hapijs/catbox)

Lead Maintainer: [Eran Hammer](https://github.com/hueniverse)

**catbox** is a multi-strategy key-value object store. It comes with extensions supporting a memory cache,
[Redis](http://redis.io/), [MongoDB](http://www.mongodb.org/), [Memcached](http://memcached.org/), [Riak](http://basho.com/riak/), [Amazon S3](http://aws.amazon.com/s3/), and [RethinkDB](http://rethinkdb.com).
**catbox** provides two interfaces: a low-level `Client` and a high-level `Policy`.


### Installation

In order to reduce module dependencies, **catbox** does not includes the external caching strategies. To use other strategies,
each service must be manually installed via npm or package dependencies manually. The available strategies are:

- [Memory](https://github.com/hapijs/catbox-memory)
- [Redis](https://github.com/hapijs/catbox-redis)
- [MongoDB](https://github.com/hapijs/catbox-mongodb)
- [Memcached](https://github.com/hapijs/catbox-memcached)
- [Riak](https://github.com/DanielBarnes/catbox-riak)
- [Amazon S3](https://github.com/fhemberger/catbox-s3)
- [RethinkDB](https://github.com/codedmart/catbox-rethinkdb)


### `Client`

The `Client` object provides a low-level cache abstraction. The object is constructed using `new Client(engine, options)` where:

- `engine` - is an object or a prototype function implementing the cache strategy:
    - function - a prototype function with the signature `function(options)`. **catbox** will call `new func(options)`.
    - object - a pre instantiated client implementation object. Does not support passing `options`.
- `options` - the strategy configuration object. Each strategy defines its own configuration options with the following common options:
    - `partition` - the partition name used to isolate the cached results across multiple clients. The partition name is used
      as the MongoDB database name, the Riak bucket, or as a key prefix in Redis and Memcached. To share the cache across multiple clients,
      use the same partition name.

Note that any implementation of client strategies must return deep copies of the stored data as the API assumes that the object returned
from a `get()` is owned by the called and can be safely modified without affecting the cache copy.


#### API

The `Client` object provides the following methods:

- `start(callback)` - creates a connection to the cache server. Must be called before any other method is available.
  The `callback` signature is `function(err)`.
- `stop()` - terminates the connection to the cache server.
- `get(key, callback)` - retrieve an item from the cache engine if found where:
    - `key` - a cache key object (see below).
    - `callback` - a function with the signature `function(err, cached)`. If the item is not found, both `err` and `cached` are `null`.
      If found, the `cached` object contains the following:
        - `item` - the value stored in the cache using `set()`.
        - `stored` - the timestamp when the item was stored in the cache (in milliseconds).
        - `ttl` - the remaining time-to-live (not the original value used when storing the object).
- `set(key, value, ttl, callback)` - store an item in the cache for a specified length of time, where:
    - `key` - a cache key object (see below).
    - `value` - the string or object value to be stored.
    - `ttl` - a time-to-live value in milliseconds after which the item is automatically removed from the cache (or is marked invalid).
    - `callback` - a function with the signature `function(err)`.
- `drop(key, callback)` - remove an item from cache where:
    - `key` - a cache key object (see below).
    - `callback` - a function with the signature `function(err)`.

Any method with a `key` argument takes an object with the following required properties:
- `segment` - a caching segment name string. Enables using a single cache server for storing different sets of items with overlapping ids.
- `id` - a unique item identifier string (per segment). Can be an empty string.


### `Policy`

The `Policy` object provides a convenient cache interface by setting a global policy which is automatically applied to every storage action.
The object is constructed using `new Policy(options, [cache, segment])` where:

- `options` - is an object with the following keys:
    - `expiresIn` - relative expiration expressed in the number of milliseconds since the item was saved in the cache. Cannot be used
      together with `expiresAt`.
    - `expiresAt` - time of day expressed in 24h notation using the 'HH:MM' format, at which point all cache records for the route
      expire. Uses local time. Cannot be used together with `expiresIn`.
    - `generateFunc` - a function used to generate a new cache item if one is not found in the cache when calling `get()`. The method's
      signature is `function(id, next)` where:
        - `id` - the `id` string or object provided to the `get()` method.
        - `next` - the method called when the new item is returned with the signature `function(err, value, ttl)` where:
            - `err` - an error condition.
            - `value` - the new value generated.
            - `ttl` - the cache ttl value in milliseconds. Set to `0` to skip storing in the cache. Defaults to the cache global policy.
    - `staleIn` - number of milliseconds to mark an item stored in cache as stale and attempt to regenerate it when `generateFunc` is
      provided. Must be less than `expiresIn`. Alternatively function that returns staleIn value in miliseconds. The function signature is
      `function(stored, ttl)` where:
        - `stored` - the timestamp when the item was stored in the cache (in milliseconds).
        - `ttl` - the remaining time-to-live (not the original value used when storing the object).
    - `staleTimeout` - number of milliseconds to wait before checking if an item is stale.
    - `generateTimeout` - number of milliseconds to wait before returning a timeout error when the `generateFunc` function
      takes too long to return a value. When the value is eventually returned, it is stored in the cache for future requests.
    - `dropOnError` - if `true`, an error or timeout in the `generateFunc` causes the stale value to be evicted from the cache.
      Defaults  to `true`.
- `cache` - a `Client` instance (which has already been started).
- `segment` - required when `cache` is provided. The segment name used to isolate cached items within the cache partition.


#### API

The `Policy` object provides the following methods:

- `get(id, callback)` - retrieve an item from the cache. If the item is not found and the `generateFunc` method was provided, a new value
  is generated, stored in the cache, and returned. Multiple concurrent requests are queued and processed once. The method arguments are:
    - `id` - the unique item identifier (within the policy segment). Can be a string or an object with the required 'id' key.
    - `callback` - the return function. The function signature is `function(err, value, cached, report)` where:
        - `err` - any errors encountered.
        - `value` - the fetched or generated value.
        - `cached` - `null` if a valid item was not found in the cache, or an object with the following keys:
            - `item` - the cached `value`.
            - `stored` - the timestamp when the item was stored in the cache.
            - `ttl` - the cache ttl value for the record.
            - `isStale` - `true` if the item is stale.
        - `report` - an object with logging information about the generation operation containing the following keys (as relevant):
            - `msec` - the cache lookup time in milliseconds.
            - `stored` - the timestamp when the item was stored in the cache.
            - `isStale` - `true` if the item is stale.
            - `ttl` - the cache ttl value for the record.
            - `error` - lookup error.
- `set(id, value, ttl, callback)` - store an item in the cache where:
    - `id` - the unique item identifier (within the policy segment).
    - `value` - the string or object value to be stored.
    - `ttl` - a time-to-live **override** value in milliseconds after which the item is automatically removed from the cache (or is marked invalid).
      This should be set to `0` in order to use the caching rules configured when creating the `Policy` object.
    - `callback` - a function with the signature `function(err)`.
- `drop(id, callback)` - remove the item from cache where:
    - `id` - the unique item identifier (within the policy segment).
    - `callback` - a function with the signature `function(err)`.
- `ttl(created)` - given a `created` timestamp in milliseconds, returns the time-to-live left based on the configured rules.
- `rules(options)` - changes the policy rules after construction (note that items already stored will not be affected) where:
    - `options` - the same `options` as the `Policy` constructor.
- `isReady()` - returns `true` if cache engine determines itself as ready, `false` if it is not ready or if there is no cache engine set.
