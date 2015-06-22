1.3.4 / 2015-02-15
==================

  * deps: cookie-signature@1.0.6

1.3.3 / 2014-09-05
==================

  * deps: cookie-signature@1.0.5

1.3.2 / 2014-06-26
==================

  * deps: cookie-signature@1.0.4
    - fix for timing attacks

1.3.1 / 2014-06-17
==================

  * actually export `signedCookie`

1.3.0 / 2014-06-17
==================

  * add `signedCookie` export for single cookie unsigning

1.2.0 / 2014-06-17
==================

  * export parsing functions
  * `req.cookies` and `req.signedCookies` are now plain objects
  * slightly faster parsing of many cookies

1.1.0 / 2014-05-12
==================

  * Support for NodeJS version 0.8
  * deps: cookie@0.1.2
    - Fix for maxAge == 0
    - made compat with expires field
    - tweak maxAge NaN error message

1.0.1 / 2014-02-20
==================

  * add missing dependencies

1.0.0 / 2014-02-15
==================

  * Genesis from `connect`
