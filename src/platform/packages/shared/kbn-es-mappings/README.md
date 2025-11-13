# @kbn/es-mappings

A TypeScript library for generating type-safe Elasticsearch mappings with full type inference support.

## Features

- **Type-safe mapping generation**: Create Elasticsearch mappings with TypeScript type safety
- **Type inference**: Automatically infer document types from mapping definitions
- **Default values**: Sensible defaults for common mapping types (e.g., text fields include keyword sub-fields)
- **Flexible configuration**: Override defaults or omit properties as needed

## Usage

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
// Result: { type: 'date' }

// Numeric fields
const integerMapping = mappings.integer();
const longMapping = mappings.long();
const shortMapping = mappings.short();

// Boolean field
const booleanMapping = mappings.boolean();

// Date nanos field
const dateNanosMapping = mappings.dateNanos();

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

### Type Inference

The package provides type utilities to infer TypeScript types from mapping definitions:

```typescript
import { mappings } from '@kbn/es-mappings';
import type { MappingsToProperties } from '@kbn/es-mappings';

// Define your mapping
const userMappingDefinition = {
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    email: mappings.keyword(),
    isActive: mappings.boolean(),
    address: mappings.object({
      street: mappings.text(),
      city: mappings.keyword(),
    }),
  },
};

// Infer the document type from the mapping
type UserDocument = MappingsToProperties<typeof userMappingDefinition>;

// TypeScript will infer:
// type UserDocument = {
//   name: string;
//   age: number;
//   email: string;
//   isActive: boolean;
//   address: {
//     street: string;
//     city: string;
//   };
// }

// Use the type for type-safe document creation
const user: UserDocument = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  isActive: true,
  address: {
    street: '123 Main St',
    city: 'New York',
  },
};
```

### Complete Example

```typescript
import { mappings } from '@kbn/es-mappings';
import type { MappingsToProperties } from '@kbn/es-mappings';

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
};

// Infer document type
type Product = MappingsToProperties<typeof productMapping>;

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

## API Reference

### Mapping Functions

All mapping functions accept an optional configuration object that allows you to override or extend the default mapping properties.

- `mappings.text(def?)` - Creates a text mapping with keyword sub-field
- `mappings.keyword(def?)` - Creates a keyword mapping
- `mappings.date(def?)` - Creates a date mapping
- `mappings.dateNanos(def?)` - Creates a date_nanos mapping
- `mappings.integer(def?)` - Creates an integer mapping
- `mappings.long(def?)` - Creates a long mapping
- `mappings.short(def?)` - Creates a short mapping
- `mappings.boolean(def?)` - Creates a boolean mapping
- `mappings.flattened(def?)` - Creates a flattened mapping
- `mappings.object(properties, def?)` - Creates an object mapping with properties

### Type Utilities

- `MappingsToProperties<M>` - Infers TypeScript document types from mapping definitions
- `Strict<P>` - Creates a strict mapping type (restricts `dynamic` to `false | 'strict'`)

## Notes

⚠️ **Important**: Default mappings are carefully chosen and used in production. Changing defaults may affect live mappings. Always test mapping changes thoroughly before deploying.

