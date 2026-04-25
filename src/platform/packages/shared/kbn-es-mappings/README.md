# @kbn/es-mappings

A TypeScript library for generating type-safe Elasticsearch mappings with full type inference support.

## Features

- **Type-safe mapping generation**: Create Elasticsearch mappings with TypeScript type safety
- **Type inference**: Automatically infer document types from mapping definitions
- **Default values**: Sensible defaults for common mapping types (e.g., text fields include keyword sub-fields)
- **Flexible configuration**: Override defaults or omit properties as needed

## Mappings

### Basic Mapping Types

```typescript
import { mappings } from '@kbn/es-mappings';

// Text field (includes keyword sub-field by default)
const textMapping = mappings.text();
// Result: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 1024 } } }

// Keyword field
const keywordMapping = mappings.keyword();
// Result: { type: 'keyword', ignore_above: 1024 }

// Date field
const dateMapping = mappings.date();
const dateNanosMapping = mappings.dateNanos();

// Numeric fields
const integerMapping = mappings.integer();
const longMapping = mappings.long();
const shortMapping = mappings.short();

// Boolean field
const booleanMapping = mappings.boolean();

// Flattened field
const flattenedMapping = mappings.flattened();
```

### Object Mappings

```typescript
import { mappings } from '@kbn/es-mappings';

// Create an object mapping with properties
const userMapping = mappings.object({
  name: mappings.text(),
  age: mappings.integer(),
  email: mappings.keyword(),
  isActive: mappings.boolean(),
  createdAt: mappings.date(),
});

// Result:
// {
//   type: 'object',
//   properties: {
//     name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 1024 } } },
//     age: { type: 'integer' },
//     email: { type: 'keyword', ignore_above: 1024 },
//     isActive: { type: 'boolean' },
//     createdAt: { type: 'date' }
//   }
// }
```

### Customizing Mappings

```typescript
import { mappings } from '@kbn/es-mappings';

// Override default properties
const customTextMapping = mappings.text({
  fields: {
    keyword: {
      type: 'keyword',
      ignore_above: 2048,
    },
  },
});

// Omit default properties (set to undefined)
const textWithoutKeyword = mappings.text({
  fields: undefined,
});
// Result: { type: 'text' }

// Customize keyword mapping
const customKeyword = mappings.keyword({
  ignore_above: 512,
});

// Add additional properties to date mapping
const customDate = mappings.date({
  format: 'strict_date_optional_time||epoch_millis',
});
```

### Nested Object Mappings

```typescript
import { mappings } from '@kbn/es-mappings';

const addressMapping = mappings.object({
  street: mappings.text(),
  city: mappings.keyword(),
  zipCode: mappings.keyword(),
});

const userMapping = mappings.object({
  name: mappings.text(),
  address: addressMapping,
  contacts: mappings.object({
    email: mappings.keyword(),
    phone: mappings.keyword(),
  }),
});
```

### Complete Example

```typescript
import { mappings } from '@kbn/es-mappings';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';

// Define a complete mapping structure
const productMapping = {
  properties: {
    id: mappings.keyword(),
    name: mappings.text(),
    description: mappings.text(),
    price: mappings.long(),
    inStock: mappings.boolean(),
    tags: mappings.keyword(),
    metadata: mappings.flattened(),
    createdAt: mappings.date(),
    updatedAt: mappings.dateNanos(),
    category: mappings.object({
      id: mappings.keyword(),
      name: mappings.text(),
    }),
  },
} satisfies MappingsDefinition;

// Infer document type
type Product = GetFieldsOf<typeof productMapping>;

// Create a type-safe document
const product: Product = {
  id: 'prod-123',
  name: 'Example Product',
  description: 'A great product',
  price: 9999,
  inStock: true,
  tags: 'electronics',
  metadata: { source: 'api', version: '1.0' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00.000000000Z',
  category: {
    id: 'cat-1',
    name: 'Electronics',
  },
};

// Use the mapping in Elasticsearch
const esMapping = {
  mappings: productMapping,
};
```

## Types

### MappingsDefinition

`MappingsDefinition` is a type that represents a valid Elasticsearch mapping definition with properties. It ensures type safety by constraining the properties to only supported mapping types.

```typescript
import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

// Create a mapping definition
const userMapping = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
  },
} satisfies MappingsDefinition;

// MappingsDefinition ensures only valid mapping properties are used
const invalidMapping: MappingsDefinition = {
  properties: {
    // @ts-expect-error - invalid_type is not a supported mapping type
    invalidField: { type: 'invalid_type' },
  },
};
```

### GetFieldsOf

`GetFieldsOf` is a utility type that infers the TypeScript document type from a mapping definition. It converts mapping definitions to their corresponding primitive TypeScript types (string, number, boolean, etc.).

```typescript
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

// Define your mapping
const userMapping = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
    isActive: mappings.boolean(),
    createdAt: mappings.date(),
    address: mappings.object({
      street: mappings.text(),
      city: mappings.keyword(),
    }),
  },
} satisfies MappingsDefinition;

// Infer the document type from the mapping
type UserDocument = GetFieldsOf<typeof userMapping>;

// TypeScript will infer:
// type UserDocument = {
//   name?: string;
//   age?: number;
//   email?: string;
//   isActive?: boolean;
//   createdAt?: string | number;
//   address?: {
//     street?: string;
//     city?: string;
//   };
// }

// Use the type for type-safe document creation
const user: UserDocument = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  address: {
    street: '123 Main St',
    city: 'New York',
  },
};

// Partial documents are also valid (all fields are optional)
const partialUser: UserDocument = {
  name: 'Jane Doe',
  age: 25,
};
```

### EnsureSubsetOf

`EnsureSubsetOf` is a type utility that ensures a subset mapping definition only contains fields that exist in a full document type. This is useful for validating that partial mapping definitions are valid subsets of a complete mapping.

```typescript
import type { EnsureSubsetOf, GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

// Define the full document fields type
interface FullEsDocumentFields {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  createdAt: string | number;
}

// Define a full mapping definition
const fullMapping = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
    isActive: mappings.boolean(),
    createdAt: mappings.date(),
  },
} satisfies MappingsDefinition;

// Define a subset mapping (only some fields)
const subsetMapping = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
  },
} satisfies MappingsDefinition;

// Ensure the subset is valid - this will compile successfully
type ValidSubset = EnsureSubsetOf<
  typeof subsetMapping,
  FullEsDocumentFields
>;

const valid: ValidSubset = true;

// If the subset contains fields not in the full document, it will fail
const invalidSubsetMapping = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
    extraField: mappings.keyword(), // This field doesn't exist in FullEsDocumentFields
  },
} satisfies MappingsDefinition;

// This will cause a TypeScript error
type InvalidSubset = EnsureSubsetOf<
  typeof invalidSubsetMapping,
  FullEsDocumentFields
>;
// Error: The following keys are missing from the document fields: extraField
```

## Adding a New Mapping Type

If you need to add support for an Elasticsearch mapping type that exists in ES but is not yet supported by this library (either because it wasn't needed before or it's a new type from a recent Elasticsearch upgrade), follow these steps:

### Step 1: Add the type to `SupportedMappingPropertyType`

In `src/types.ts`, add the new mapping type to the `SupportedMappingPropertyType` union:

```typescript
type SupportedMappingPropertyType = AllMappingPropertyType &
  (
    | 'text'
    | 'integer'
    | 'keyword'
    | 'boolean'
    | 'date'
    | 'short'
    | 'byte'
    | 'float'
    | 'date_nanos'
    | 'double'
    | 'long'
    | 'object'
    | 'your_new_type' // Add your new type here
  );
```

### Step 2: Update `ToPrimitives` to map it to a primitive type

In `src/types.ts`, update the `ToPrimitives` type to map your new mapping type to its corresponding TypeScript primitive type (string, number, boolean, etc.):

```typescript
export type ToPrimitives<O extends { properties: Record<string, MappingProperty> }> = {} extends O
  ? never
  : {
      [K in keyof O['properties']]: {} extends O['properties'][K]
        ? never
        : O['properties'][K] extends { type: infer T }
        ? T extends 'keyword'
          ? // ... existing mappings ...
          : T extends 'your_new_type'
          ? string // or number, boolean, etc. - choose the appropriate primitive
          : // ... rest of mappings ...
        : never;
    };
```

### Step 3: (Optional) Add a mapping function

If you want to provide a convenient function for creating this mapping type, add it to `src/mappings.ts`:

```typescript
export function yourNewType(def?: WithoutTypeField<YourNewTypeMapping>): YourNewTypeMapping {
  const defaults: YourNewTypeMapping = omitUnsetKeys(
    {
      type: 'your_new_type',
      // Add any default properties here
    },
    def
  );

  return merge(defaults, def);
}
```

Don't forget to:
- Export the type alias for your mapping type in `src/types.ts` (e.g., `export type YourNewTypeMapping = Strict<api.MappingYourNewTypeProperty>;`)
- Import and export the function in the appropriate files

## Notes

⚠️ **Important**: Default mappings are carefully chosen and used in production. Changing defaults may affect live mappings. Always test mapping changes thoroughly before deploying.
