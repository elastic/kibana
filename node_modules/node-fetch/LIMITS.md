
Known differences
=================

*As of 1.x release*

- Topics such as cross-origin, content security policy, mixed content, service workers are ignored, given our server-side context.

- Url input must be an absolute url, using either `http` or `https` as scheme.

- On the upside, there are no forbidden headers, and `res.url` contains the final url when following redirects.

- For convenience, `res.body` is a transform stream, so decoding can be handled independently.

- Similarly, `req.body` can either be a string or a readable stream.

- Only support `res.text()` and `res.json()` at the moment, until there are good use-cases for blob.

- There is currently no built-in caching, as server-side caching varies by use-cases.
