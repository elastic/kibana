2.2.0 / 2014-09-02
==================

  * deps: debug@~2.0.0

2.1.3 / 2014-08-10
==================

  * deps: parseurl@~1.3.0
  * deps: vary@~1.0.0

2.1.2 / 2014-07-22
==================

  * deps: debug@1.0.4
  * deps: parseurl@~1.2.0
    - Cache URLs based on original value
    - Remove no-longer-needed URL mis-parse work-around
    - Simplify the "fast-path" `RegExp`

2.1.1 / 2014-07-11
==================

  * deps: debug@1.0.3
    - Add support for multiple wildcards in namespaces

2.1.0 / 2014-07-08
==================

  * add simple debug output
  * deps: methods@1.1.0
    - add `CONNECT`
  * deps: parseurl@~1.1.3
    - faster parsing of href-only URLs

2.0.2 / 2014-06-05
==================

  * use vary module for better `Vary` behavior

2.0.1 / 2014-06-02
==================

  * deps: methods@1.0.1

2.0.0 / 2014-06-01
==================

  * Default behavior only checks `X-HTTP-Method-Override` header
  * New interface, less magic
    - Can specify what header to look for override in, if wanted
    - Can specify custom function to get method from request
  * Only `POST` requests are examined by default
  * Remove `req.body` support for more standard query param support
    - Use custom `getter` function if `req.body` support is needed
  * Set `Vary` header when using built-in header checking

1.0.2 / 2014-05-22
==================

  * Handle `req.body` key referencing array or object
  * Handle multiple HTTP headers

1.0.1 / 2014-05-17
==================

  * deps: pin dependency versions

1.0.0 / 2014-03-03
==================

  * Genesis from `connect`
