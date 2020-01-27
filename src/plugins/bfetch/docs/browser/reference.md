# `bfetch` browser reference

- [`fetchStreaming`](#fetchStreaming)


## `fetchStreaming`

Executes an HTTP request and expects that server streams back results using
HTTP/1 `Transfer-Encoding: chunked`.

```ts
const { stream } = bfetch.fetchStreaming({ url: 'http://elastic.co' });

stream.subscribe(value => {});
```