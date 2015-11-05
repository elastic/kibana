
Changelog
=========


# 1.x release

## v1.3.3 (master)

- Fix: make sure `Content-Length` header is set when body is string for POST/PUT/PATCH requests
- Fix: handle body stream error, for cases such as incorrect `Content-Encoding` header
- Fix: when following certain redirects, use `GET` on subsequent request per Fetch Spec
- Fix: `Request` and `Response` constructors now parse headers input using `Headers`

## v1.3.2

- Enhance: allow auto detect of form-data input (no `FormData` spec on node.js, this is form-data specific feature)

## v1.3.1

- Enhance: allow custom host header to be set (server-side only feature, as it's a forbidden header on client-side)

## v1.3.0

- Enhance: now fetch.Request is exposed as well

## v1.2.1

- Enhance: `Headers` now normalized `Number` value to `String`, prevent common mistakes

## v1.2.0

- Enhance: now fetch.Headers and fetch.Response are exposed, making testing easier

## v1.1.2

- Fix: `Headers` should only support `String` and `Array` properties, and ignore others

## v1.1.1

- Enhance: now req.headers accept both plain object and `Headers` instance

## v1.1.0

- Enhance: timeout now also applies to response body (in case of slow response)
- Fix: timeout is now cleared properly when fetch is done/has failed

## v1.0.6

- Fix: less greedy content-type charset matching

## v1.0.5

- Fix: when follow = 0, fetch should not follow redirect
- Enhance: update tests for better coverage
- Enhance: code formatting
- Enhance: clean up doc

## v1.0.4

- Enhance: test iojs support
- Enhance: timeout attached to socket event only fire once per redirect

## v1.0.3

- Fix: response size limit should reject large chunk
- Enhance: added character encoding detection for xml, such as rss/atom feed (encoding in DTD)

## v1.0.2

- Fix: added res.ok per spec change

## v1.0.0

- Enhance: better test coverage and doc


# 0.x release

## v0.1

- Major: initial public release
