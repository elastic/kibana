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
| `getSpaceNPRE(request)` | `kibana_space_<id>_default` | Route to a specific Kibana space |

The factory maps routing options as follows:

| `projectRouting` option | `project_routing` value injected |
|-------------------------|----------------------------------|
| `'origin-only'` | `PROJECT_ROUTING_ORIGIN` |
| `'all'` | `PROJECT_ROUTING_ALL` |
| `KibanaRequest` | Space NPRE derived from the request URL |
