# Migrating from `@hapi/boom` to `KibanaHttpError`

`KibanaHttpError` and `KibanaHttpErrors` produce the same JSON error body shape as Boom (statusCode, error label, message, optional attributes) for API compatibility.

**Before (Boom):**

```ts
import Boom from '@hapi/boom';
throw Boom.badRequest('Invalid input');
```

**After (Kibana):**

```ts
import { KibanaHttpErrors } from '@kbn/core-http-server';
throw KibanaHttpErrors.badRequest('Invalid input');
```

`wrapErrors` / `handleLegacyErrors` and `registerRoutes` treat both Boom and `KibanaHttpError`. Migrate route code incrementally; Boom remains supported until all call sites are updated.
