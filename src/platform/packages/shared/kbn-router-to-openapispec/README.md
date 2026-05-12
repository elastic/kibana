# @kbn/router-to-openapispec

Generate OAS from router definitions.

## Query parameter handling

### Array union collapsing

Query parameters defined as `schema.oneOf([schema.string(), schema.arrayOf(schema.string())])` (kbn-config-schema) or `z.union([z.string(), z.array(z.string())])` (zod) produce `anyOf`/`oneOf` with two branches in the raw OAS output. Since OAS 3.0 query parameters with `style: form` natively support repeating a parameter for multiple values, the union is redundant.

This package automatically collapses these unions to plain array schemas: `{type: 'array', items: {type: 'string'}}`. The collapse applies only to query parameters (not request bodies) and matches schemas with exactly two branches where one is a scalar type and the other is an array of that scalar type. Enum constraints and array constraints like `maxItems` are preserved.