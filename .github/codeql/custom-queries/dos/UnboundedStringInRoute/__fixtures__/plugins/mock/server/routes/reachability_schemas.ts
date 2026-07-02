// Cross-file request schemas consumed by reachability.ts. Strings here reach a
// route's request validation via imports, so they SHOULD be flagged.
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';

// Grouping object bound to `validate: { request: ... }` in another file.
export const CrossFileRequest = {
  body: schema.object({ crossFileName: schema.string() }), // $ Alert
};

// Zod schema wrapped by buildRouteValidationWithZod in another file.
export const CrossFileZodBody = z.object({ crossFileNote: z.string() }); // $ Alert

// Base schema composed via `.extends` in another file.
export const BaseReq = schema.object({ baseField: schema.string() }); // $ Alert
