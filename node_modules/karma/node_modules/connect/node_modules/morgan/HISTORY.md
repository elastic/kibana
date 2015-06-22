1.3.2 / 2014-09-27
==================

  * Fix `req.ip` integration when `immediate: false`

1.3.1 / 2014-09-14
==================

  * Remove un-used `bytes` dependency
  * deps: depd@0.4.5

1.3.0 / 2014-09-01
==================

  * Assert if `format` is not a function or string

1.2.3 / 2014-08-16
==================

  * deps: on-finished@2.1.0

1.2.2 / 2014-07-27
==================

  * deps: depd@0.4.4
    - Work-around v8 generating empty stack traces

1.2.1 / 2014-07-26
==================

  * deps: depd@0.4.3
    - Fix exception when global `Error.stackTraceLimit` is too low

1.2.0 / 2014-07-19
==================

  * Add `:remote-user` token
  * Add `combined` log format
  * Add `common` log format
  * Add `morgan(format, options)` function signature
  * Deprecate `default` format -- use `combined` format instead
  * Deprecate not providing a format
  * Remove non-standard grey color from `dev` format

1.1.1 / 2014-05-20
==================

  * simplify method to get remote address

1.1.0 / 2014-05-18
==================

  * "dev" format will use same tokens as other formats
  * `:response-time` token is now empty when immediate used
  * `:response-time` token is now monotonic
  * `:response-time` token has precision to 1 μs
  * fix `:status` + immediate output in node.js 0.8
  * improve `buffer` option to prevent indefinite event loop holding
  * deps: bytes@1.0.0
    - add negative support

1.0.1 / 2014-05-04
==================

  * Make buffer unique per morgan instance
  * deps: bytes@0.3.0
    * added terabyte support

1.0.0 / 2014-02-08
==================

  * Initial release
