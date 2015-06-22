1.8.2 / 2014-09-15
==================

  * Use `crc` instead of `buffer-crc32` for speed
  * deps: depd@0.4.5

1.8.1 / 2014-09-08
==================

  * Keep `req.session.save` non-enumerable
  * Prevent session prototype methods from being overwritten

1.8.0 / 2014-09-07
==================

  * Do not resave already-saved session at end of request
  * deps: cookie-signature@1.0.5
  * deps: debug@~2.0.0

1.7.6 / 2014-08-18
==================

  * Fix exception on `res.end(null)` calls

1.7.5 / 2014-08-10
==================

  * Fix parsing original URL
  * deps: on-headers@~1.0.0
  * deps: parseurl@~1.3.0

1.7.4 / 2014-08-05
==================

  * Fix response end delay for non-chunked responses

1.7.3 / 2014-08-05
==================

  * Fix `res.end` patch to call correct upstream `res.write`

1.7.2 / 2014-07-27
==================

  * deps: depd@0.4.4
    - Work-around v8 generating empty stack traces

1.7.1 / 2014-07-26
==================

  * deps: depd@0.4.3
    - Fix exception when global `Error.stackTraceLimit` is too low

1.7.0 / 2014-07-22
==================

  * Improve session-ending error handling
    - Errors are passed to `next(err)` instead of `console.error`
  * deps: debug@1.0.4
  * deps: depd@0.4.2
    - Add `TRACE_DEPRECATION` environment variable
    - Remove non-standard grey color from color output
    - Support `--no-deprecation` argument
    - Support `--trace-deprecation` argument

1.6.5 / 2014-07-11
==================

  * Do not require `req.originalUrl`
  * deps: debug@1.0.3
    - Add support for multiple wildcards in namespaces

1.6.4 / 2014-07-07
==================

  * Fix blank responses for stores with synchronous operations

1.6.3 / 2014-07-04
==================

  * Fix resave deprecation message

1.6.2 / 2014-07-04
==================

  * Fix confusing option deprecation messages

1.6.1 / 2014-06-28
==================

  * Fix saveUninitialized deprecation message

1.6.0 / 2014-06-28
==================

  * Add deprecation message to undefined `resave` option
  * Add deprecation message to undefined `saveUninitialized` option
  * Fix `res.end` patch to return correct value
  * Fix `res.end` patch to handle multiple `res.end` calls
  * Reject cookies with missing signatures

1.5.2 / 2014-06-26
==================

  * deps: cookie-signature@1.0.4
    - fix for timing attacks

1.5.1 / 2014-06-21
==================

  * Move hard-to-track-down `req.secret` deprecation message

1.5.0 / 2014-06-19
==================

  * Debug name is now "express-session"
  * Deprecate integration with `cookie-parser` middleware
  * Deprecate looking for secret in `req.secret`
  * Directly read cookies; `cookie-parser` no longer required
  * Directly set cookies; `res.cookie` no longer required
  * Generate session IDs with `uid-safe`, faster and even less collisions

1.4.0 / 2014-06-17
==================

  * Add `genid` option to generate custom session IDs
  * Add `saveUninitialized` option to control saving uninitialized sessions
  * Add `unset` option to control unsetting `req.session`
  * Generate session IDs with `rand-token` by default; reduce collisions
  * deps: buffer-crc32@0.2.3

1.3.1 / 2014-06-14
==================

  * Add description in package for npmjs.org listing

1.3.0 / 2014-06-14
==================

  * Integrate with express "trust proxy" by default
  * deps: debug@1.0.2

1.2.1 / 2014-05-27
==================

  * Fix `resave` such that `resave: true` works

1.2.0 / 2014-05-19
==================

  * Add `resave` option to control saving unmodified sessions

1.1.0 / 2014-05-12
==================

  * Add `name` option; replacement for `key` option
  * Use `setImmediate` in MemoryStore for node.js >= 0.10

1.0.4 / 2014-04-27
==================

  * deps: debug@0.8.1

1.0.3 / 2014-04-19
==================

  *  Use `res.cookie()` instead of `res.setHeader()`
  * deps: cookie@0.1.2

1.0.2 / 2014-02-23
==================

  * Add missing dependency to `package.json`

1.0.1 / 2014-02-15
==================

  * Add missing dependencies to `package.json`

1.0.0 / 2014-02-15
==================

  * Genesis from `connect`
