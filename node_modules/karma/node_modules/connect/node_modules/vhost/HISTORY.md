3.0.0 / 2014-08-29
==================

  * Remove support for sub-http servers; use the `handle` function

2.0.0 / 2014-06-08
==================

  * Accept `RegExp` object for `hostname`
  * Provide `req.vhost` object
  * Remove old invocation of `server.onvhost`
  * String `hostname` with `*` behaves more like SSL certificates
    - Matches 1 or more characters instead of zero
    - No longer matches "." characters
  * Support IPv6 literal in `Host` header

1.0.0 / 2014-03-05
==================

  * Genesis from `connect`
