# @kbn/cps-server-utils

Server-side Cross-Project Search (CPS) utilities.

## `getSpaceNPRE`

Returns the Named Project Routing Expression (NPRE) for a given space, using the convention `kibana_space_${spaceId}_default`.

Accepts either a `spaceId` string or a `ScopeableUrlRequest` (`KibanaRequest` or synthetic `UrlRequest` from `@kbn/core-elasticsearch-server`). The space is parsed from a URL pathname with `@kbn/spaces-utils` (`getSpaceIdFromPath`).

For real HTTP requests, the Spaces plugin rewrites incoming URLs so `request.url` no longer contains `/s/<spaceId>`. Core stores the pre-rewrite URL on `request.rewrittenUrl` when the first pre-routing handler returns `rewriteUrl`. `getSpaceNPRE` uses `rewrittenUrl` when it is set, so non-default spaces resolve correctly. Synthetic `UrlRequest` objects only provide `url`.

CPS runs on Serverless only, where Kibana does not use a custom `server.basePath`; `getSpaceNPRE` does not strip a server base path from the pathname before matching `/s/...`.

A `FakeRequest` without `url` is not accepted and will throw at runtime.

```ts
import { getSpaceNPRE } from '@kbn/cps-server-utils';

// From a space ID string
getSpaceNPRE('my-space');  // '@kibana_space_my-space_default'
getSpaceNPRE('');          // '@kibana_space_default_default'

// From a KibanaRequest (uses rewrittenUrl when present, else url.pathname)
getSpaceNPRE(request);     // e.g. '@kibana_space_my-space_default'
```
