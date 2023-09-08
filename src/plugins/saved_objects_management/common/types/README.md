## Versioned interfaces

This folder contains types that are shared between the server and client:

```ts
// v1.ts
export interface SavedObjectWithMetadata { name: string }

// index.ts
import * as v1 from './v1';
export type { v1 };

// Used elsewhere
import type { v1 } from '../common';
const myObject: v1.SavedObjectWithMetadata = { name: 'my object' };
```

**Do not alter a versioned type**. Types may be in use by clients (if the code is released).
Alterations must be made on a new version of the TS interface.

## Create a new version

Versions in this plugin are determined using monotonically increasing numbers: 1, 2, 3, etc.

1. Find the latest version, e.g: `v2`.
2. Create a new file, e.g., `v3.ts` if it does not exist.
3. Copy the type(s) to change from previous version. E.g. `v2.ts`'s `SavedObjectWithMetadata`.
4. Alter the interface as needed
5. Re-export `v2` types to "inherit" the entire previous version's types: `export * from './v2';`
6. Export your new version from latest: `export * from './v3';`. This may result in TS errors
   to be fixed.
7. Export your new file from index.ts as `v3`.

Your `v3.ts` file should look something like:

```ts
export * from './v3';
export interface SavedObjectWithMetadata { name: string; a_new_field: string; }
```

In this way the entire API is accessible from `v3` including types that may
not have changed.

Any alterations post-release must be in a new version (start at step 1).


## The `latest.ts` file

The `latest.ts` file is a container for all "latest" versions of types. This is useful
for app code that always needs the latest version of your interfaces. E.g.:

```ts
import type { SavedObjectWithMetadata } from '../common';
```

Notice that there is no version number mentioned. Either in the interface name
or import path. To update the "latest" type you must re-export the new version
from the appropriate versioned path.
