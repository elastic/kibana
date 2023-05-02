# How to expand types

This library is a copy-and-port of `@kbn/config-schema` such that the same
interface is maintained where possible. If there is a type you want to add from
`@kbn/config-schema` you should start by copying that type to the `src/types` directory
along with it's tests.

Reference already ported types to get an idea of how `zod` replaces `joi`.

# Where are the conditional and reference types?

Do not introduce `.conditional()` or `.reference()` to this library.

`@kbn/schema` is not a complete replica of `@kbn/config-schema`. The API conforms
where possible but is also smaller and simpler.

If you find you need `.conditional()` or `.reference()` you are probably in one
of two situations:

1. You need some context, probably to dynamically set a default value
2. You need to reference the state of another key in an object to dynamically
   create a schema. E.g., a `string` in key `foo` means we want a `boolean` in `bar`.

In both of these cases you can meet your needs using simple types and TypeScript.

In case (1):

```ts
const type = schema.conditional(
  schema.contextRef('context_value_1'), // <- one piece of context "magically" defined at validation time
  schema.contextRef('context_value_2'), // <- other context, also some magic
  schema.string({ defaultValue: 'equal' }),
  schema.string({ defaultValue: 'not equal' })
);

type.validate(undefined, {
  context_value_1: 1,
  context_value_2: 0,
})
// Returns "equal"

// The above can be refactored to:
interface CreateSchemaArgs {
  contextValue: boolean;
}
function createSchema({ contextValue }: CreateSchemaArgs) {
  return schema.string({ defaultValue: contextValue ? 'equal' : 'not equal' });
}
```

In case (2):

```ts
const type = schema.object(
  {
    key: schema.string(),
    value: schema.conditional(
      schema.siblingRef('key'), // Non-typed string reference to "parent" object prop "key"
      'foo',
      schema.number(),
      schema.string()
    ),
  }
);

type.validate({ key: 'foo', value: 100 }); // OK
type.validate({ key: 'not foo', value: 100 }); // NOK at runtime

// The above can be refactored to:
const type = schema.object(
  {
    key: schema.string(),
    value: schema.oneOf([
      schema.number(),
      schema.string()
    ])
  },
  {
    // This is an "object" level concern, so validate at that level
    validate: (v) => {
      if (v.key === 'foo' && typeof v.value !== 'number') {
        return '[value] must be a number when [key] is "foo"'; // Write a contextualized error message
      }
    },
  }
);
```