## Versioned interfaces

This folder contains types that are shared between the server and client:

```ts
// v1.ts
export interface SavedObjectWithMetadata { name: string }
```

This type is _versioned_ because it lives in the file `v1.ts`. Thus it is "v1"
of this type.

**Do not alter a versioned type**. Types may be in use by clients. Alterations
must be made on a new version of the TS interface. Versions are determined
using monotonically increasing numbers: 1, 2, 3, etc.

## Create a new version

1. Find the latest version of your type, e.g: v3.
2. Create a new file, e.g., "v3.ts" in this folder if it does not exist.
3. Copy the interface you want to alter from the previous version, "v2.ts"
4. Alter the interface as needed
5. Ensure that all documentation is inherited from prior interfaces using
   the @inheritdoc directive
6. Export your new file from index.ts as `v3`.


## The `latest.ts` file

The `latest.ts` file is a container for all "latest" versions of types. This is useful
for app code that always needs the latest version of your interfaces. E.g.:

```ts
import type { SavedObjectWithMetadata } from '../common';
```

Notice that there is no version number mentioned. Either in the interface name
or import path. To update the "latest" type you must re-export the new version
from the appropriate versioned path.