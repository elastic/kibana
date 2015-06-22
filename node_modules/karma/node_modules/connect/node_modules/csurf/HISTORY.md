1.6.6 / 2015-01-31
==================

  * deps: csrf@~2.0.5
    - deps: base64-url@1.2.0
    - deps: uid-safe@~1.0.3

1.6.5 / 2015-01-08
==================

  * deps: csrf@~2.0.4
    - deps: uid-safe@~1.0.2

1.6.4 / 2014-12-30
==================

  * deps: csrf@~2.0.3
    - Slight speed improvement for `verify`
    - deps: base64-url@1.1.0
    - deps: rndm@~1.1.0
  * deps: http-errors@~1.2.8
   - Fix stack trace from exported function

1.6.3 / 2014-11-09
==================

  * deps: csrf@~2.0.2
    - deps: scmp@1.0.0
  * deps: http-errors@~1.2.7
   - Remove duplicate line

1.6.2 / 2014-10-14
==================

  * Fix cookie name when using `cookie: true`
  * deps: http-errors@~1.2.6
    - Fix `expose` to be `true` for `ClientError` constructor
    - Use `inherits` instead of `util`
    - deps: statuses@1

1.6.1 / 2014-09-05
==================

  * deps: cookie-signature@1.0.5

1.6.0 / 2014-09-03
==================

  * Set `code` property on CSRF token errors

1.5.0 / 2014-08-24
==================

  * Add `ignoreMethods` option

1.4.1 / 2014-08-22
==================

  * Use `csrf-tokens` instead of `csrf`
 
1.4.0 / 2014-07-30
==================

  * Support changing `req.session` after `csurf` middleware
    - Calling `res.csrfToken()` after `req.session.destroy()` will now work

1.3.0 / 2014-07-03
==================

  * Add support for environments without `res.cookie` (connect@3)

1.2.2 / 2014-06-18
==================

  * deps: csrf-tokens@~2.0.0

1.2.1 / 2014-06-09
==================

  * Refactor to use `csrf-tokens` module

1.2.0 / 2014-05-13
==================

  * Add support for double-submit cookie

1.1.0 / 2014-04-06
==================

  * Add constant-time string compare
