# CPS Request Handler

## What is CPS?

Cross-Project Search (CPS) is an Elasticsearch feature that lets Kibana route queries across multiple Elastic projects transparently. Kibana forwards each request with a `project_routing` parameter; Elasticsearch handles execution, security enforcement, and result aggregation across the targeted projects.

CPS is only available on serverless deployments. The `cps.cpsEnabled` flag (sourced from `coreContext.configService`, set by `ElasticsearchService` in `@kbn/core-elasticsearch-server-internal`) controls whether CPS is active for the current Kibana instance.

## Files

| File | Purpose |
|------|---------|
| `cps_request_handler.ts` | Core `OnRequestHandler` logic: injects or strips `project_routing` per request |
| `cps_request_handler_factory.ts` | Factory that maps routing options to a configured handler instance |

## Behavior

### CPS enabled (`cpsEnabled: true`)

For any ES API that declares `project_routing` in `meta.acceptedParams`:

- **Regular APIs** (JSON body): inject `project_routing` into `params.body`, unless already present.
- **NDJSON APIs** (`msearch`, `msearch_template`): inject `project_routing` into `params.querystring`, not the body - injecting into an NDJSON body corrupts the format and causes ES to return `illegal_argument_exception`.
- **PIT-based searches**: strip `project_routing` from the body. The PIT carries its own routing scope, established when the PIT was opened via `openPointInTime`.

For any ES API whose structured `meta.acceptedParams` declares that `project_routing` is *not* accepted (e.g. `update_by_query`, `index`, `bulk`), a caller-supplied `project_routing` is stripped from `params.body`, `params.querystring` and `params.bulkBody`, and a warning naming the API is logged. Passing `project_routing` to such an API is always a caller bug: the ES JS client forwards unrecognised params into the request body, so ES rejects the request with `parsing_exception: Unknown key for a VALUE_STRING in [project_routing]` — or, for document APIs where the body *is* the document, silently indexes a stray field.

This strip applies only when `acceptedParams` is the structured form emitted by the client for a known API. Requests with no `acceptedParams` (raw `transport.request()` callers) or with a legacy flat-array `acceptedParams` are left untouched, because that metadata is not authoritative about what the API accepts and their `project_routing` may be valid.

Behavior summary when CPS is enabled:

| `meta.acceptedParams` | Caller supplied `project_routing` | Handling | `routingType` |
|---|---|---|---|
| declares it in `query` | no | inject into `params.querystring` | `injected` |
| declares it in `query` | yes | leave caller value | `explicit` |
| declares it in `body` | no | inject into `params.body` | `injected` |
| declares it in `body` | yes | leave caller value | `explicit` |
| declares it in `body`, request has `body.pit` | either | strip from body (PIT carries its own scope) | `stripped` |
| structured, declares it nowhere | no | no-op | `none` (`bypassReason: api_does_not_support_routing`) |
| structured, declares it nowhere | yes | strip from body/querystring/bulkBody + `logger.warn` | `none` (`bypassReason: api_does_not_support_routing`) |
| missing or legacy flat array | either | leave untouched | `none` (other `bypassReason`) |

## Routing context and metrics

Each request records a `cpsRoutingContext` on `options.context`, consumed on the response side by `instrumentCpsMetrics` in `configure_client.ts` to emit `kibana.elasticsearch.cps.request.count`.

| Context field | Metric attribute | Notes |
|---|---|---|
| `cpsEnabled` | `kibana.cps.enabled` | Always attached |
| `routingType` | `kibana.cps.routing.type` | Always attached |
| `routingAccepted` | `kibana.cps.routing.accepted` | Always attached |
| `unsupportedParamStripped` | `kibana.cps.routing.unsupported_param_stripped` | Always attached; `true` only when a caller-supplied `project_routing` was stripped from an API that does not accept it |
| `bypassReason` | `kibana.cps.routing.bypass_reason` | Attached only when `routingType` is `none` |
| `apiName` | `db.operation.name` | Always attached |

`unsupportedParamStripped` is an orthogonal dimension: it does not change `routingType` or `bypassReason`, so a strip is still counted as `routingType: none` with `bypassReason: api_does_not_support_routing`. Filter on the attribute to find plugins passing `project_routing` to an API that cannot accept it.

### CPS disabled (`cpsEnabled: false`)

Strip `project_routing` from all locations, unconditionally:

- `params.body` (regular JSON body)
- `params.querystring`
- `params.bulkBody` (NDJSON bulk body, used by `msearch` / `msearch_template`)

Stripping is always unconditional regardless of API or whether `meta.name` is set, so raw `transport.request()` calls are also covered.

## NDJSON bulk body edge cases

`msearch` and `msearch_template` route their payload through `params.bulkBody` (not `params.body`). The high-level ES client builds `bulkBody` as an `Array<Record<string, unknown>>` of alternating header/body objects (e.g. `[{ index: 'my-index', project_routing: '...' }, { query: ... }]`); the transport serializes it to NDJSON before sending.

`project_routing` can appear in any of these objects. When CPS is disabled the handler strips it from each entry before serialization. Supported `bulkBody` shapes:

| Shape | Handling |
|-------|----------|
| `Array<Record<string, unknown>>` | Mutate each plain-object entry in-place |
| `string` (pre-serialized NDJSON) | Split on `\n`, parse each line, strip, re-join |
| `Buffer` / `ReadableStream` | Skipped - cannot be safely parsed or rewritten |

## `project_routing` values

| Constant / source | Value | Meaning |
|-------------------|-------|---------|
| `PROJECT_ROUTING_ORIGIN` | `_alias:_origin` | Route to the origin project (default) |
| `PROJECT_ROUTING_ALL` | `_alias:*` | Route across all projects |
| `getSpaceNPRE(request)` | `kibana_space_<id>_default` | Route to a specific Kibana space; uses `request.rewrittenUrl` when set so space is correct after Spaces pre-routing strips `/s/:id` from `request.url` |

The factory maps routing options as follows:

| `projectRouting` option | `project_routing` value injected |
|-------------------------|----------------------------------|
| `'origin-only'` | `PROJECT_ROUTING_ORIGIN` |
| `'all'` | `PROJECT_ROUTING_ALL` |
| `KibanaRequest` | Space NPRE derived from the request URL |
