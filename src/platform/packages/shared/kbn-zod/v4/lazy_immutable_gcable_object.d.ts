/**
 * Wraps an object factory in a Proxy that defers construction of the underlying
 * object until any property is first accessed. The materialized object is cached
 * behind a `WeakRef`, so once no external consumer keeps it alive the GC is free
 * to reclaim it; the next access rebuilds it from the factory. Function-valued
 * properties are bound to the materialized object so methods observe a stable
 * `this`.
 *
 * Intended for cases where many objects are declared at module-load time but
 * only a subset is used at runtime. Unused entries stay as a single Proxy
 * instance plus a closure, keeping baseline heap low; transiently-used entries
 * are collectible after their last reference is dropped.
 *
 * Trade-off: if the same object is used repeatedly across GC cycles without
 * callers retaining a reference, each cycle pays the cost of rebuilding it.
 * Hold on to a reference (e.g. `const o = LazyThing; o.method(...)` inside a
 * hot path) if that matters. Writes (`obj.prop = ...`) and deletions throw.
 *
 * Caveat: `instanceof` checks on the returned value will be `false` because the
 * Proxy target is an empty object. Property enumeration (`Object.keys`,
 * `for...in`, spread) and descriptor lookups (`Object.getOwnPropertyDescriptor`)
 * reflect the materialized object; descriptors are coerced to `configurable: true`
 * to satisfy Proxy invariants against the empty target.
 */
export declare function lazyImmutableGCableObject<T extends object>(factory: () => T): T;
