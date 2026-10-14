# @kbn/connector-contract-mock

Dev-only contract mock for the connectors in `@kbn/connector-specs`. It validates the requests a connector makes against the vendor's API spec and answers them with responses that conform to that spec, so connector tests run without vendor credentials or network access.

This package is being built in stages (see [#295684](https://github.com/elastic/kibana/issues/295684)).

## In-process mock

```ts
import { createContractMockFetch } from '@kbn/connector-contract-mock';

const { fetch, calls } = createContractMockFetch({ specs: [openApiDocument] });
```

The mock is a standard `fetch`. Connector clients built on axios use it through axios's fetch adapter, `{ adapter: 'fetch', env: { fetch } }`, so axios still builds the URL and serializes parameters exactly as it would against the vendor. The package itself doesn't depend on axios, whose new use Kibana disallows.

For every request, the mock:

1. routes it to an operation by server URL and path template, answering **404** with the method and URL when none matches and **405** naming the allowed methods when only the method is wrong. When several templates match, the one with the fewest parameters wins, then the one with the most literal text, so `/items/new` and `/items/{id}:archive` both take precedence over `/items/{id}`;
2. validates it against the operation, answering **422** with `{ operation, violations }` when it breaks the spec. Parameters are deserialized by `style` and `explode` and checked against their schemas, as is the body for its declared content type. Undeclared query parameters and repeated keys for `explode: false` parameters are flagged too;
3. builds a response, then validates its status code, headers and body against the spec.

Each request is recorded in `calls` with its operation, status, and request and response violations, so tests can assert that a connector stays within the contract. `matched` gives the operation's method and path template.

Connectors that call several vendor specs (one per API version or product) can name them:

```ts
const { fetch, calls } = createContractMockFetch({ specs: { v1: datadogV1, v2: datadogV2 } });
```

Each call's `matched.source` then says which spec answered it. Fixtures, recordings and pagination entries can name a `source` next to their method and path template to apply to that spec only; without one, they apply to the operation in every spec.

## Server mode

A running Kibana can't use an in-process `fetch`, so the mock can also sit behind an HTTP forward proxy, which Kibana reaches through `xpack.actions.proxyUrl`:

```ts
import { createCertificateAuthority, createContractMockProxy } from '@kbn/connector-contract-mock';

const certificateAuthority = createCertificateAuthority();
const proxy = createContractMockProxy({ fetch: mock.fetch, certificateAuthority });
const proxyUrl = await proxy.listen(8080);
```

Requests aren't forwarded: the proxy answers each one with `fetch`, so the vendor hosts in connector code and config need no changes. Plain HTTP requests arrive in absolute form (`GET http://vendor.example/path`). HTTPS ones arrive through `CONNECT` tunnels, whose TLS the proxy terminates with a certificate for the requested host, issued on first use by `certificateAuthority`. Requests sent to the proxy as if it were the vendor get **400**, and errors thrown by `fetch` **502**.

Clients must trust the CA's certificate (`certificateAuthority.cert`, PEM). Kibana's actions plugin trusts it for a vendor host through `xpack.actions.customHostSettings` (`ssl.certificateAuthoritiesData`), or for every host through the `NODE_EXTRA_CA_CERTS` environment variable. `createCertificateAuthority({ cert, key })` loads a CA created earlier, so a Kibana configured to trust it keeps working when the mock restarts.

## GraphQL

GraphQL APIs are specs too: the schema in SDL, and the URLs the vendor serves it at.

```ts
const { fetch, calls } = createContractMockFetch({
  specs: {
    v2: mondayOpenApi,
    graphql: { format: 'graphql', sdl: mondaySchema, endpoints: ['https://api.monday.com/v2'] },
  },
});
```

Requests to an endpoint (`GET` with `query`, `operationName` and `variables` in the query string, or `POST` with them in a JSON body) are parsed and validated against the schema, and their variables and arguments coerced to their declared types. A request that breaks the schema gets **400** with GraphQL `errors`, and a mutation sent with `GET` is rejected. Valid requests execute against the schema with sampled values, so a response has exactly the fields the document selects: scalars are sampled as in OpenAPI responses (custom scalars by their names, such as `ISO8601DateTime`), enums answer their first value, lists hold one item, abstract types resolve to their first possible type, and `Boolean`s are `false`, so flags such as a connection's `hasNextPage` end paging after one page. Documents that use `@defer` or `@stream` get **501**.

Each root field a request selects is recorded in `calls` as its own operation, named by the operation type and field, such as `query items`. Its `matched` has that `name` instead of a method and path, and `readOnly` is `true` for queries.

## MCP

MCP servers are specs too: the tools their `tools/list` describes, and the URLs of their Streamable HTTP endpoint.

```ts
const { fetch, calls } = createContractMockFetch({
  specs: {
    mcp: { format: 'mcp', tools: githubTools, endpoints: ['https://api.githubcopilot.com/mcp/'] },
  },
});
```

The mock answers as a stateless server that replies with JSON: `POST`s must name both `application/json` and `text/event-stream` in `Accept`, and carry a JSON-RPC message or batch; `GET` (the event stream) and `DELETE` (ending a session) get **405**. Specs whose tools have no `inputSchema` object, or list a tool twice, are refused.

`tools/call` arguments are validated against the tool's `inputSchema`, and arguments it doesn't declare are reported when it declares its `properties` and doesn't allow others, as servers ignore them. Calls that break the schema, or name a tool the spec doesn't list, get a JSON-RPC `InvalidParams` error. Valid calls answer a sample of the tool's `outputSchema` as JSON text, and as `structuredContent` when the sample is an object; tools without one answer `{}`.

`tools/list` and each `tools/call` are recorded in `calls` as operations named by the method and tool, such as `tools/call get_me`, with `readOnly` from the tool's `readOnlyHint` annotation. The other messages, such as `initialize`, are recorded with `protocolMessage: true`.

## Credentials

Requests need the credentials of one of the operation's `security` requirements (or the document's), in the place each scheme declares: the `apiKey` header, query parameter or cookie, or an `Authorization` header with the `http` scheme (`Basic`, `Bearer`, …), and `Bearer` for `oauth2` and `openIdConnect`. Any value is accepted. A request without them gets **401** listing what the operation expects, which catches connectors that forget a credential or send it in the wrong place. Schemes that can't be checked on a request, such as `mutualTLS`, count as present, and API keys in the query string aren't reported as undeclared parameters.

The `tokenUrl` and `refreshUrl` of each `oauth2` flow (relative ones resolved against the server) issue stub bearer tokens, as an authorization server would (RFC 6749): a form-encoded `POST` with the `grant_type` of a declared flow and the parameters it requires gets a token, and `client_credentials` also needs `client_id` or Basic client authentication. Token URLs also accept JWT bearer assertions (RFC 7523, `urn:ietf:params:oauth:grant-type:jwt-bearer`), as service accounts such as Google's send them; signatures aren't checked, and an assertion that claims a `target_audience` gets an `id_token`, as Google issues. Other requests get the OAuth error a vendor would return, such as `unsupported_grant_type`. Token requests are recorded in `calls` with `token: true`. Token URLs the spec also documents as operations are answered by those operations.

Vendor specs are sometimes wrong about authentication too. Trello's declares only OAuth2 for most operations, while the API also takes `key` and `token` query parameters; an overlay can add the missing requirement:

```yaml
- target: $.paths.*.*.security
  description: Trello also accepts the API key and token as query parameters.
  update:
    - APIKey: []
      APIToken: []
```

## Responses

Responses come from, in order of preference:

1. **Fixtures**: hand-written responses passed as `fixtures`, for operations where nothing else is good enough;
2. **Recordings**: responses captured from the real vendor API, passed as `recordings`. A recording is served only while it conforms to the spec; one that doesn't, or that names an operation the spec lacks, is listed in `rejectedResponses`, which signals drift on the vendor's side. Recorded error responses are not served by default;
3. **Spec examples**: the response media type's `example` or `examples`, when they match the schema;
4. **Samples** of the response schema.

Fixtures and recordings name their operation by method and path template, not by URL, so they apply whatever the request's parameters are:

```ts
const { fetch, rejectedResponses } = createContractMockFetch({
  specs: [openApiDocument],
  recordings: [
    {
      recordedAt: '2026-10-06',
      exchanges: [
        {
          operation: { method: 'GET', path: '/api/v1/monitor' },
          response: { status: 200, body: [{ id: 1, name: 'CPU' }] },
        },
      ],
    },
  ],
});
```

Examples and samples use the lowest declared 2xx response (then `2XX`, then `default`; operations without one, such as downloads that redirect or endpoints the vendor removed, get their lowest declared 3xx, then their lowest declared status) and the content type that best matches the request's `Accept` header, preferring JSON; the mock answers **406** when no content type matches. Sampled values come from the schema's first `examples` entry, `example` or `default` that conforms to the schema, then its `const` or first `enum` value, and otherwise from a placeholder that stays within the schema's type, format and bounds (`minimum`/`maximum`, `multipleOf`, `minLength`/`maxLength`, `minItems`/`maxItems`, and `pattern`, sampled from the regex). Vendors' examples often contradict their own schemas (a date-time under `format: date`, a number for a string), so non-conforming ones are skipped; examples of schemas merged from `allOf` parts are used unchecked. For `oneOf`, the first variant whose sample matches exactly one variant is used. Below a fixed depth only required properties are generated, which keeps recursive schemas finite. Required properties the schema doesn't declare are filled from `additionalProperties`, or with `null`. Pass `respond: (operation, request) => response` to replace examples and samples.

`sampleJsonSchema(schema, { optional, boundary })` samples a standalone JSON Schema the same way, with refs resolving against the schema itself (`#/$defs/...`), for example to generate inputs from a zod schema converted with `z.toJSONSchema`. `optional: 'required'` leaves out optional properties at every depth; `boundary: true` samples at the upper bounds, ignoring examples and defaults.

To test how a connector handles extreme responses, pass `respond: sampleBoundaryResponse`. It skips examples and samples bodies at the schema's upper bounds: strings at `maxLength` (1024 characters when unbounded), numbers at `maximum` or the largest value of their format (`int32`, `float`; `int64` and unbounded integers at `Number.MAX_SAFE_INTEGER`), arrays at `maxItems` (capped at 100; 3 items when unbounded, one for `uniqueItems`), and the last `enum` value. Fixtures and recordings are still preferred. Vendor `oneOf`s whose variants only differ in their examples can't be sampled without them, and are reported in the call's `responseViolations`; an overlay can correct them.

## Pagination

Operations listed in `pagination` (method, path template and a descriptor from the connector's manifest) serve a virtual collection of `collectionSize` items (default 3), built from the first item of the response they would otherwise get, with distinct `id`s. The request's cursor, offset or page number and page size select a slice. For `cursor`, `offset` and `page`, `request.in` says whether they are read from the query (default), the JSON body or headers:

- `cursor`: the next cursor is written at `nextPath` in the body, or in the `nextPath` header with `response.in: 'header'` (and at `hasMorePath`, if given); the last page signals the end as the vendor does (`empty_string`, `null` or `missing`). Cursors are opaque positions; a cursor the mock didn't issue gets **400**.
- `offset` and `page`: the total is written at `totalPath`, if given.
- `link`: the next page's URL is sent in a `Link: <url>; rel="next"` header, as on GitHub, and left out on the last page.
- `next_url`: the next page's URL is written at `nextPath` in the body, as with Microsoft Graph's `@odata.nextLink`, and is `null` or missing on the last page. Leave out `request` when the URL is opaque and no source names its page parameter, as with Azure's `nextLink`: the mock then selects pages with its own `contract-mock-page` query parameter, which request validation ignores.

Next-page URLs are the request's URL with the cursor, offset or page parameter named in `request` set to the next page. Body paths use lodash syntax; quote keys that contain dots, as in `["@odata.nextLink"]`. An empty `itemsPath` means the body is the collection itself, as with Datadog's `GET /api/v1/monitor`; such a body has no room for a next cursor, URL or total, so these operations page by offset, page number, `Link` header or a cursor in a header.

When an operation has recordings, its collection is the recorded pages joined, in place of copies of one item. Recordings store each exchange's request (`query`, `headers`, `body`) so pages can be placed: a page requested by offset or page number starts there, and a page requested with a vendor cursor starts where the page that returned that cursor ended. Recorded cursors then resolve to their position, so replaying them works, and the mock hands them out for the pages they lead to. `collectionSize` cuts the recorded items or pads them with copies of the last one. A fixture for the operation overrides its recordings.

Page sizes above the vendor's `maximum` already get **422** from request validation.

## Correcting vendor specs

Vendor specs are sometimes wrong about the API they describe: a parameter documented in the query string is sent in the body, or a property marked required is often missing. When verification against the real API shows this, record the correction in an [OpenAPI Overlay](https://spec.openapis.org/overlay/v1.1.0.html) next to the spec, rather than editing the vendor's file, and apply it before loading:

```yaml
overlay: 1.1.0
info:
  title: Trello corrections
  version: 1.0.0
actions:
  - target: $.paths['/cards'].post.parameters[?@.name == 'idList']
    description: idList is sent in the JSON body; verified against the API on 2026-10-06.
    remove: true
  - target: $.components.schemas.Card.required[?@ == 'badges']
    description: Archived cards omit badges.
    remove: true
```

```ts
const { document, findings } = applyOverlay(vendorSpec, overlay);
const { fetch } = createContractMockFetch({ specs: [document], recordings });
```

The mock then enforces the API's real contract, and recordings the vendor's spec contradicted are served. Say in each action's `description` (or an `x-` field) what showed the spec to be wrong, so the correction can be dropped once the vendor fixes it.

`applyOverlay` returns a corrected copy of the document. It implements the `update`, `copy` and `remove` actions of Overlay 1.0 and 1.1: `update` merges objects, appends to arrays and replaces primitives. Items an `update` would append are skipped when the array already has them. Targets are JSONPath ([RFC 9535](https://www.rfc-editor.org/rfc/rfc9535)) without function extensions. A malformed overlay or target throws an `InvalidOverlayError` naming the action. `findings` lists actions that matched nothing (`no-match`) or changed nothing (`no-change`), which signals that the vendor changed or fixed that part of the spec and the correction needs another look.

## Spec loading

Google API Discovery documents convert to OpenAPI 3.0 with `convertDiscovery` (`isDiscoveryDocument` recognizes them). Each method becomes an operation at its `flatPath` under `rootUrl` + `servicePath`. Reserved expansions such as `v1/{+name}:access` can't match requests, because OpenAPI path parameters can't contain slashes, so `flatPath` is used instead. Each operation gets the API-wide parameters next to its own, its request and response schemas as JSON bodies, and its OAuth scopes as security requirements. Schemas become components, with draft 3 `required: true` property flags moved into `required` lists. Simple media uploads become operations of their own, served from `rootUrl`.

`loadContractOperations` accepts a parsed OpenAPI 3.x or Swagger 2.0 document (converted to OpenAPI 3.0 first, with `convertSwagger2`, which is also exported) and returns its operations: method, path, servers, parameters (with `style` and `explode` defaults applied), request body and responses. Parameter, request body, response and header refs are resolved. Schemas are not dereferenced: each one stays in place in a copy of the document, together with its JSON pointer, so its refs keep resolving against the document. This keeps large specs such as Microsoft Graph fast to load. The schema dialect follows the OpenAPI version: OpenAPI 3.0 schemas for 3.0, JSON Schema 2020-12 for 3.1 and later.

Loading also rewrites schemas as plain JSON Schema and repairs defects common in vendor specs, in place and following refs: OpenAPI 3.0's `nullable` becomes a union with `null`, duplicate `enum` values are removed, regex escapes that are invalid under the `u` flag are dropped, and OpenAPI 3.0's boolean `exclusiveMinimum`/`exclusiveMaximum` become numeric bounds. It then checks every schema for defects that would break validation (unresolvable `$ref`s, unknown `type`s, patterns that don't compile, and keywords with values of the wrong type) and throws an `InvalidSchemaError` listing each operation and location that still has one, so a broken spec fails at load instead of on the first request that uses it.

Schemas are validated with [`@cfworker/json-schema`](https://github.com/cfworker/cfworker/tree/main/packages/json-schema), as draft-07 for OpenAPI 3.0 and draft 2020-12 for 3.1 and later. It interprets schemas without generating code, and checks the JSON Schema formats (such as `date-time`, `email` and `uri`) but not OpenAPI's own (such as `int32` and `byte`).
