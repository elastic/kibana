# @kbn/cps-server-utils

Server-side Cross-Project Search (CPS) utilities.

## `getSpaceNPRE`

Returns the Named Project Routing Expression (NPRE) for a given space, using the convention `kibana_space_${spaceId}_default`.

Accepts a `SpaceId` from `@kbn/core-spaces-common`.

```ts
import { getSpaceNPRE } from '@kbn/cps-server-utils';

getSpaceNPRE('my-space');  // '@kibana_space_my-space_default'
getSpaceNPRE('default');   // '@kibana_space_default_default'
```
