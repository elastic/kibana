# @kbn/cps-server-utils

Server-side Cross-Project Search (CPS) utilities.

## `getSpaceNPRE`

Returns the Named Project Routing Expression (NPRE) for a given space, using the convention `kibana_space_${spaceId}_default`.

Accepts either a `spaceId` string or a `KibanaRequest` (from which the space is derived via the request URL path, without a dependency on the `spaces` plugin).

```ts
import { getSpaceNPRE } from '@kbn/cps-server-utils';

// From a space ID string
getSpaceNPRE('my-space');  // 'kibana_space_my-space_default'
getSpaceNPRE('');          // 'kibana_space_default_default'

// From a KibanaRequest (extracts space from the URL path)
getSpaceNPRE(request);     // e.g. 'kibana_space_my-space_default'
```
