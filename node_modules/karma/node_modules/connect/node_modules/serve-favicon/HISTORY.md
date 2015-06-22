2.1.7 / 2014-11-19
==================

  * Avoid errors from enumerables on `Object.prototype`

2.1.6 / 2014-10-16
==================

  * deps: etag@~1.5.0

2.1.5 / 2014-09-24
==================

  * deps: etag@~1.4.0

2.1.4 / 2014-09-15
==================

  * Fix content headers being sent in 304 response
  * deps: etag@~1.3.1
    - Improve ETag generation speed

2.1.3 / 2014-09-07
==================

  * deps: fresh@0.2.4

2.1.2 / 2014-09-05
==================

  * deps: etag@~1.3.0
    - Improve ETag generation speed

2.1.1 / 2014-08-25
==================

  * Fix `ms` to be listed as a dependency

2.1.0 / 2014-08-24
==================

  * Accept string for `maxAge` (converted by `ms`)
  * Use `etag` to generate `ETag` header

2.0.1 / 2014-06-05
==================

  * Reduce byte size of `ETag` header

2.0.0 / 2014-05-02
==================

  * `path` argument is required; there is no default icon.
  * Accept `Buffer` of icon as first argument.
  * Non-GET and HEAD requests are denied.
  * Send valid max-age value
  * Support conditional requests
  * Support max-age=0
  * Support OPTIONS method
  * Throw if `path` argument is directory.

1.0.2 / 2014-03-16
==================

  * Fixed content of default icon.

1.0.1 / 2014-03-11
==================

  * Fixed path to default icon.

1.0.0 / 2014-02-15
==================

  * Initial release
