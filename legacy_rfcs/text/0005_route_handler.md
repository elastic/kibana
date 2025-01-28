- Start Date: 2019-06-29
- RFC PR: (leave this empty)
- Kibana Issue: https://github.com/elastic/kibana/issues/33779

# Summary

Http Service in New platform should provide the ability to execute some logic in response to an incoming request and send the result of this operation back.

# Basic example
Declaring a route handler for `/url` endpoint:
```typescript
router.get(
  { path: '/url', ...[otherRouteParameters] },
  (context: Context, request: KibanaRequest, t: KibanaResponseToolkit) => {
   // logic to handle request ...
   return t.ok(result);
);

```

# Motivation
The new platform is built with library-agnostic philosophy and we cannot transfer the current solution for Network layer from Hapi. To avoid vendor lock-in in the future, we have to define route handler logic and request/response objects formats that can be implemented in any low-level library such as Express, Hapi, etc. It means that we are going to operate our own abstractions for such Http domain entities as Router, Route, Route Handler, Request, Response.

# Detailed design
The new platform doesn't support the Legacy platform `Route Handler` format nor exposes implementation details, such as [Hapi.ResponseToolkit](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/hapi/v17/index.d.ts#L984).
Rather `Route Handler` in New platform has the next signature:
```typescript
type RequestHandler = (
  context: Context,
  request: KibanaRequest,
  t: KibanaResponseToolkit
) => KibanaResponse | Promise<KibanaResponse>;
```
and accepts next Kibana specific parameters as arguments:
- context: [Context](https://github.com/elastic/kibana/blob/main/rfcs/text/0003_handler_interface.md#handler-context). A handler context contains core service and plugin functionality already scoped to the incoming request.
- request: [KibanaRequest](https://github.com/elastic/kibana/blob/main/src/core/packages/http/server/src/router/request.ts). An immutable representation of the incoming request details, such as body, parameters, query, url and route information. Note: you **must** to specify route schema during route declaration to have access to `body, parameters, query` in the request object. You  cannot extend KibanaRequest with arbitrary data nor remove any properties from it.
```typescript
interface KibanaRequest {
  url: url.Url;
  headers: Record<string, string | string [] | undefined>;
  params?: Record<string, any>;
  body?: Record<string, any>;
  query?: Record<string, any>;
  route: {
    path: string;
    method: 'get' | 'post' | ...
    options: {
      tags: string [];
    }
  }
}
```
-  t: [KibanaResponseToolkit](https://github.com/elastic/kibana/blob/main/src/core/packages/http/server/src/router/response.ts)
Provides a set of pre-configured methods to respond to an incoming request. It is expected that handler **always** returns a result of one of `KibanaResponseToolkit` methods as an output:
```typescript
interface KibanaResponseToolkit {
  [method:string]: (...params: any) => KibanaResponse
}
router.get(...,
  (context: Context, request: KibanaRequest, t: KibanaResponseToolkit): KibanaResponse => {
   return t.ok();
   // or
   return t.redirected('/url');
   // or
   return t.badRequest(error);
);
```
*KibanaResponseToolkit*  methods allow an end user to adjust the next response parameters:
- Body. Supported values:`undefined | string | JSONValue | Buffer | Stream`.
- Status code. 
- Headers. Supports adjusting [known values](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/v10/http.d.ts#L8) and attaching [custom values as well](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/v10/http.d.ts#L67)

Other response parameters, such as `etag`, `MIME-type`, `bytes` that used in the Legacy platform could be adjusted via Headers.

The router handler doesn't expect that logic inside can throw or return something different from `KibanaResponse`. In this case, Http service will respond with `Server error` to prevent exposure of internal logic details.

#### KibanaResponseToolkit methods
Basic primitives:
```typescript
type HttpResponsePayload = undefined | string | JSONValue | Buffer | Stream;
interface HttpResponseOptions {
  headers?: {
   // list of  known headers
   ...
   // for custom headers:
   [header: string]: string | string[];
  }
}

```

##### Success
Server indicated that request was accepted:
```typescript
type SuccessResponse<T> = <T extends HttpResponsePayload>(
  payload: T,
  options?: HttpResponseOptions
) => KibanaResponse<T>;

const kibanaResponseToolkit = {
  ok: <T extends HttpResponsePayload>(payload: T, options?: HttpResponseOptions) =>
    new KibanaResponse(200, payload, options),
  accepted: <T extends HttpResponsePayload>(payload: T, options?: HttpResponseOptions) =>
    new KibanaResponse(202, payload, options),
  noContent: (options?: HttpResponseOptions) => new KibanaResponse(204, undefined, options)
```

##### Redirection
The server wants a user to perform additional actions.
```typescript
const kibanaResponseToolkit = {
  redirected: (url: string, options?: HttpResponseOptions) => new KibanaResponse(302, url, options),
  notModified: (options?: HttpResponseOptions) => new KibanaResponse(304, undefined, options),
```

#####  Error
Server signals that request cannot be handled and explains details of the error situation
```typescript
// Supports attaching additional data to send to the client
interface ResponseError extends Error {
  meta?: {
    data?: JSONValue;
    errorCode?: string; // error code to simplify search, translations in i18n, etc.
    docLink?: string; // link to the docs
  }
}

export const createResponseError = (error: Error | string, meta?: ResponseErrorType['meta']) =>
  new ResponseError(error, meta)

const kibanaResponseToolkit = {
  // Client errors
  badRequest: <T extends ResponseError>(err: T, options?: HttpResponseOptions) =>
    new KibanaResponse(400, err, options),
  unauthorized: <T extends ResponseError>(err: T, options?: HttpResponseOptions) =>
    new KibanaResponse(401, err, options),

  forbidden: <T extends ResponseError>(err: T, options?: HttpResponseOptions) =>
    new KibanaResponse(403, err, options),
  notFound: <T extends ResponseError>(err: T, options?: HttpResponseOptions) =>
    new KibanaResponse(404, err, options),
  conflict: <T extends ResponseError>(err: T, options?: HttpResponseOptions) =>
    new KibanaResponse(409, err, options),

  // Server errors
  internal: <T extends ResponseError>(err: T, options?: HttpResponseOptions) =>
    new KibanaResponse(500, err, options),
```

##### Custom
If a custom response is required
```typescript
interface CustomOptions extends HttpResponseOptions {
  statusCode: number;
}
export const kibanaResponseToolkit = {
  custom: <T extends HttpResponsePayload>(payload: T, {statusCode, ...options}: CustomOptions) =>
    new KibanaResponse(statusCode, payload, options),
```
# Drawbacks
- `Handler` is not compatible with Legacy platform implementation when anything can be returned or thrown from handler function and server send it as a valid result. Transition to the new format may require additional work in plugins.
- `Handler` doesn't cover **all** functionality of the Legacy server at the current moment. For example, we cannot render a view in New platform yet and in this case, we have to proxy the request to the Legacy platform endpoint to perform rendering. All such cases should be considered in an individual order.
- `KibanaResponseToolkit` may not cover all use cases and requires an extension for specific use-cases.
- `KibanaResponseToolkit` operates low-level Http primitives, such as Headers e.g., and it is not always handy to work with them directly.
- `KibanaResponse` cannot be extended with arbitrary data. 

# Alternatives

- `Route Handler` may adopt well-known Hapi-compatible format.
- `KibanaResponseToolkit` can expose only one method that allows specifying any type of response body, headers, status without creating additional abstractions and restrictions.
- `KibanaResponseToolkit` may provide helpers for more granular use-cases, say `
binary(data: Buffer, type: MimeType, size: number) => KibanaResponse`

# Adoption strategy

Breaking changes are expected during migration to the New platform. To simplify adoption we could provide an extended set of type definitions for primitives with high variability of possible values (such as content-type header, all headers in general).

# How we teach this

`Route Handler`, `Request`, `Response` terms are familiar to all Kibana developers. Even if their interface is different from existing ones, it shouldn't be a problem to adopt the code to the new format. Adding a section to the Migration guide should be sufficient.

# Unresolved questions

Is proposed functionality cover all the use cases of the `Route Handler` and responding to a request?
