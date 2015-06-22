2.0.6 / 2015-02-13
==================

  * deps: base64-url@1.2.1
  * deps: uid-safe@~1.1.0
    - Use `crypto.randomBytes`, if available
    - deps: base64-url@1.2.1

2.0.5 / 2015-01-31
==================

  * deps: base64-url@1.2.0
  * deps: uid-safe@~1.0.3
    - Fix error branch that would throw
    - deps: base64-url@1.2.0

2.0.4 / 2015-01-08
==================

  * deps: uid-safe@~1.0.2
    - Remove dependency on `mz`

2.0.3 / 2014-12-30
==================

  * Slight speed improvement for `verify`
  * deps: base64-url@1.1.0
  * deps: rndm@~1.1.0

2.0.2 / 2014-11-09
==================

  * deps: scmp@1.0.0

2.0.1 / 2014-08-22
==================

  * Rename module to `csrf`

2.0.0 / 2014-06-18
==================

  * Use `uid-safe` module
  * Use `base64-url` module
  * Remove sync `.secret()` -- use `.secretSync()` instead

1.0.4 / 2014-06-11
==================

  * Make sure CSRF tokens are URL safe
