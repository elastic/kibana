# `@kbn/config-schema` — The Kibana config validation library

`@kbn/config-schema` is a TypeScript library inspired by Joi and designed to allow run-time validation of the
Kibana configuration entries providing developers with a fully typed model of the validated data.

## Table of Contents

- [Why `@kbn/config-schema`?](#why-kbnconfig-schema)
- [Schema building blocks](#schema-building-blocks)
  - [Basic types](#basic-types)
    - [`schema.string()`](#schemastring)
    - [`schema.number()`](#schemanumber)
    - [`schema.boolean()`](#schemaboolean)
    - [`schema.literal()`](#schemaliteral)
    - [`schema.buffer()`](#schemabuffer)
    - [`schema.stream()`](#schemastream)
  - [Composite types](#composite-types)
    - [`schema.arrayOf()`](#schemaarrayof)
    - [`schema.object()`](#schemaobject)
    - [`schema.recordOf()`](#schemarecordof)
    - [`schema.mapOf()`](#schemamapof)
  - [Advanced types](#advanced-types)
    - [`schema.oneOf()`](#schemaoneof)
    - [`schema.any()`](#schemaany)
    - [`schema.maybe()`](#schemamaybe)
    - [`schema.nullable()`](#schemanullable)
    - [`schema.never()`](#schemanever)
    - [`schema.uri()`](#schemauri)
    - [`schema.byteSize()`](#schemabytesize)
    - [`schema.duration()`](#schemaduration)
    - [`schema.conditional()`](#schemaconditional)
  - [References](#references)
    - [`schema.contextRef()`](#schemacontextref)
    - [`schema.siblingRef()`](#schemasiblingref)
- [Custom validation](#custom-validation)
- [Default values](#default-values)

## Why `@kbn/config-schema`?

Validation of externally supplied data is very important for Kibana. Especially if this data is used to configure how it operates.

There are a number of reasons why we decided to roll our own solution for the configuration validation:

* **Limited API surface** - having a future rich library is awesome, but it's a really hard task to audit such library and make sure everything is sane and secure enough. As everyone knows complexity is the enemy of security and hence we'd like to have a full control over what exactly we expose and commit to maintain.
* **Custom error messages** - detailed validation error messages are a great help to developers, but at the same time they can contain information that's way too sensitive to expose to everyone. We'd like to control these messages and make them only as detailed as really needed. For example, we don't want validation error messages to contain the passwords for internal users to show-up in the logs. These logs are commonly ingested into Elasticsearch, and accessible to a large number of users which shouldn't have access to the internal user's password.
* **Type information** - having run-time guarantees is great, but additionally having compile-time guarantees is even better. We'd like to provide developers with a fully typed model of the validated data so that it's harder to misuse it _after_ validation.
* **Upgradability** - no matter how well a validation library is implemented, it will have bugs and may need to be improved at some point anyway. Some external libraries are very well supported, some aren't or won't be in the future. It's always a risk to depend on an external party with their own release cadence when you need to quickly fix a security vulnerability in a patch version. We'd like to have a better control over lifecycle of such an important piece of our codebase. 

## Schema building blocks

The schema is composed of one or more primitives depending on the shape of the data you'd like to validate.

```typescript
const simpleStringSchema = schema.string();
const moreComplexObjectSchema = schema.object({ name: schema.string() });
```

Every schema instance has a `validate` method that is used to perform a validation of the data according to the schema. This method accepts three arguments:

* `data: any` - **required**, data to be validated with the schema
* `context: Record<string, any>` - **optional**, object whose properties can be referenced by the [context references](#schemacontextref)
* `namespace: string` - **optional**, arbitrary string that is used to prefix every error message thrown during validation

```typescript
const valueSchema = schema.object({
  isEnabled: schema.boolean(),
  env: schema.string({ defaultValue: schema.contextRef('envName') }),
});

expect(valueSchema.validate({ isEnabled: true, env: 'prod' })).toEqual({
  isEnabled: true,
  env: 'prod',
});

// Use default value for `env` from context via reference
expect(valueSchema.validate({ isEnabled: true }, { envName: 'staging' })).toEqual({
  isEnabled: true,
  env: 'staging',
});

// Fail because of type mismatch
expect(() =>
  valueSchema.validate({ isEnabled: 'non-bool' }, { envName: 'staging' })
).toThrowError(
  '[isEnabled]: expected value of type [boolean] but got [string]'
);

// Fail because of type mismatch and prefix error with a custom namespace
expect(() =>
  valueSchema.validate({ isEnabled: 'non-bool' }, { envName: 'staging' }, 'configuration')
).toThrowError(
  '[configuration.isEnabled]: expected value of type [boolean] but got [string]'
);
```

__Notes:__
* `validate` method throws as soon as the first schema violation is encountered, no further validation is performed.
* when you retrieve configuration within a Kibana plugin `validate` function is called by the Core automatically providing appropriate namespace and context variables (environment name, package info etc.).

### Basic types

#### `schema.string()`

Validates input data as a string.

__Output type:__ `string`

__Options:__
  * `defaultValue: string | Reference<string> | (() => string)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: string) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.
  * `minLength: number` - defines a minimum length the string should have.
  * `maxLength: number` - defines a maximum length the string should have.
  * `hostname: boolean` - indicates whether the string should be validated as a valid hostname (per [RFC 1123](https://tools.ietf.org/html/rfc1123)).

__Usage:__
```typescript
const valueSchema = schema.string({ maxLength: 10 });
```

__Notes:__
* By default `schema.string()` allows empty strings, to prevent that use non-zero value for `minLength` option.
* To validate a string using a regular expression use a custom validator function, see [Custom validation](#custom-validation) section for more details.

#### `schema.number()`

Validates input data as a number.

__Output type:__ `number`

__Options:__
  * `defaultValue: number | Reference<number> | (() => number)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: number) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.
  * `min: number` - defines a minimum value the number should have.
  * `max: number` - defines a maximum value the number should have.

__Usage:__
```typescript
const valueSchema = schema.number({ max: 10 });
```

__Notes:__
* The `schema.number()` also supports a string as input if it can be safely coerced into number.

#### `schema.boolean()`

Validates input data as a boolean.

__Output type:__ `boolean`

__Options:__
  * `defaultValue: boolean | Reference<boolean> | (() => boolean)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: boolean) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.boolean({ defaultValue: false });
```

__Notes:__
* The `schema.boolean()` also supports a string as input if it equals `'true'` or `'false'` (case-insensitive).

#### `schema.literal()`

Validates input data as a [string](https://www.typescriptlang.org/docs/handbook/advanced-types.html#string-literal-types), [numeric](https://www.typescriptlang.org/docs/handbook/advanced-types.html#numeric-literal-types) or boolean literal.

__Output type:__ `string`, `number` or `boolean` literals

__Options:__
  * `defaultValue: TLiteral | Reference<TLiteral> | (() => TLiteral)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: TLiteral) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = [
  schema.literal('stringLiteral'),
  schema.literal(100500),
  schema.literal(false),
];
```

#### `schema.buffer()`

Validates input data as a NodeJS `Buffer`.

__Output type:__ `Buffer`

__Options:__
  * `defaultValue: TBuffer | Reference<TBuffer> | (() => TBuffer)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: TBuffer) => Buffer | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.buffer({ defaultValue: Buffer.from('Hi, there!') });
```

#### `schema.stream()`

Validates input data as a NodeJS `stream`.

__Output type:__ `Stream`, `Readable` or `Writtable`

__Options:__
  * `defaultValue: TStream | Reference<TStream> | (() => TStream)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: TStream) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.stream({ defaultValue: new Stream() });
```

### Composite types

#### `schema.arrayOf()`

Validates input data as a homogeneous array with the values being validated against predefined schema.

__Output type:__ `TValue[]`

__Options:__
  * `defaultValue: TValue[] | Reference<TValue[]> | (() => TValue[])` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: TValue[]) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.
  * `minSize: number` - defines a minimum size the array should have.
  * `maxSize: number` - defines a maximum size the array should have.

__Usage:__
```typescript
const valueSchema = schema.arrayOf(schema.number());
```

#### `schema.object()`

Validates input data as an object with a predefined set of properties.

__Output type:__ `{ [K in keyof TProps]: TypeOf<TProps[K]> } as TObject`

__Options:__
  * `defaultValue: TObject | Reference<TObject> | (() => TObject)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: TObject) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.
  * `allowUnknowns: boolean` - indicates whether unknown object properties should be allowed. It's `false` by default.

__Usage:__
```typescript
const valueSchema = schema.object({ 
  isEnabled: schema.boolean({ defaultValue: false }),
  name: schema.string({ minLength: 10 }),
});
```

__Notes:__
* Using `allowUnknowns` is discouraged and should only be used in exceptional circumstances. Consider using `schema.recordOf()` instead.
* Currently `schema.object()` always has a default value of `{}`, but this may change in the near future. Try to not rely on this behaviour and specify default value explicitly or use `schema.maybe()` if the value is optional.

#### `schema.recordOf()`

Validates input data as an object with the keys and values being validated against predefined schema.

__Output type:__ `Record<TKey, TValue>`

__Options:__
  * `defaultValue: Record<TKey, TValue> | Reference<Record<TKey, TValue>> | (() => Record<TKey, TValue>)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: Record<TKey, TValue>) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.recordOf(schema.string(), schema.number());
```

__Notes:__
* You can use a union of literal types as a record's key schema to restrict record to a specific set of keys, e.g. `schema.oneOf([schema.literal('isEnabled'), schema.literal('name')])`.

#### `schema.mapOf()`

Validates input data as a map with the keys and values being validated against the predefined schema.

__Output type:__ `Map<TKey, TValue>`

__Options:__
  * `defaultValue: Map<TKey, TValue> | Reference<Map<TKey, TValue>> | (() => Map<TKey, TValue>)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: Map<TKey, TValue>) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.mapOf(schema.string(), schema.number());
```

### Advanced types

#### `schema.oneOf()`

Allows a list of alternative schemas to validate input data against.

__Output type:__ `TValue1 | TValue2 | TValue3 | ..... as TUnion`

__Options:__
  * `defaultValue: TUnion | Reference<TUnion> | (() => TUnion)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: TUnion) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.oneOf([schema.literal('∞'), schema.number()]);
```

__Notes:__
* Since the result data type is a type union you should use various TypeScript type guards to get the exact type.

#### `schema.any()`

Indicates that input data shouldn't be validated and returned as is.

__Output type:__ `any`

__Options:__
  * `defaultValue: any | Reference<any> | (() => any)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: any) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.any();
```

__Notes:__
* `schema.any()` is essentially an escape hatch for the case when your data can __really__ have any type and should be avoided at all costs.

#### `schema.maybe()`

Indicates that input data is optional and may not be present.

__Output type:__ `T | undefined`

__Usage:__
```typescript
const valueSchema = schema.maybe(schema.string());
```

__Notes:__
* Don't use `schema.maybe()` if a nested type defines a default value.

#### `schema.nullable()`

Indicates that input data is optional and defaults to `null` if it's not present.

__Output type:__ `T | null`

__Usage:__
```typescript
const valueSchema = schema.nullable(schema.string());
```

__Notes:__
* `schema.nullable()` also treats explicitly specified `null` as a valid input.

#### `schema.never()`

Indicates that input data is forbidden.

__Output type:__ `never`

__Usage:__
```typescript
const valueSchema = schema.never();
```

__Notes:__
* `schema.never()` has a very limited application and usually used within [conditional schemas](#schemaconditional) to fully or partially forbid input data.

#### `schema.uri()`

Validates input data as a proper URI string (per [RFC 3986](https://tools.ietf.org/html/rfc3986)).

__Output type:__ `string`

__Options:__
  * `defaultValue: string | Reference<string> | (() => string)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: string) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.
  * `scheme: string | string[]` - limits allowed URI schemes to the one(s) defined here.

__Usage:__
```typescript
const valueSchema = schema.uri({ scheme: 'https' });
```

__Notes:__
* Prefer using `schema.uri()` for all URI validations even though it may be possible to replicate it with a custom validator for `schema.string()`.

#### `schema.byteSize()`

Validates input data as a proper digital data size.

__Output type:__ `ByteSizeValue`

__Options:__
  * `defaultValue: ByteSizeValue | string | number | Reference<ByteSizeValue | string | number> | (() => ByteSizeValue | string | number)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: ByteSizeValue | string | number) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.
  * `min: ByteSizeValue | string | number` - defines a minimum value the size should have.
  * `max: ByteSizeValue | string | number` - defines a maximum value the size should have.

__Usage:__
```typescript
const valueSchema = schema.byteSize({ min: '3kb' });
```

__Notes:__
* The string value for `schema.byteSize()` and its options supports the following optional suffixes: `b`, `kb`, `mb`, `gb` and `tb`. The default suffix is `b`.
* The number value is treated as a number of bytes and hence should be a positive integer, e.g. `100` is equal to `'100b'`.
* Currently you cannot specify zero bytes with a string format and should use number `0` instead.

#### `schema.duration()`

Validates input data as a proper [duration](https://momentjs.com/docs/#/durations/).

__Output type:__ `moment.Duration`

__Options:__
  * `defaultValue: moment.Duration | string | number | Reference<moment.Duration | string | number> | (() => moment.Duration | string | number)` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: moment.Duration | string | number) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.duration({ defaultValue: '70ms' });
```

__Notes:__
* The string value for `schema.duration()` supports the following optional suffixes: `ms`, `s`, `m`, `h`, `d`, `w`, `M` and `Y`. The default suffix is `ms`.
* The number value is treated as a number of milliseconds and hence should be a positive integer, e.g. `100` is equal to `'100ms'`.

#### `schema.conditional()`

Allows a specified condition that is evaluated _at the validation time_ and results in either one or another input validation schema.

The first argument is always a [reference](#references) while the second one can be:
* another reference, in this cases both references are "dereferenced" and compared
* schema, in this case the schema is used to validate "dereferenced" value of the first reference
* value, in this case "dereferenced" value of the first reference is compared to that value

The third argument is a schema that should be used if the result of the aforementioned comparison evaluates to `true`, otherwise `schema.conditional()` should fallback
to the schema provided as the fourth argument.

__Output type:__ `TTrueResult | TFalseResult`

__Options:__
  * `defaultValue: TTrueResult | TFalseResult | Reference<TTrueResult | TFalseResult> | (() => TTrueResult | TFalseResult` - defines a default value, see [Default values](#default-values) section for more details.
  * `validate: (value: TTrueResult | TFalseResult) => string | void` - defines a custom validator function, see [Custom validation](#custom-validation) section for more details.

__Usage:__
```typescript
const valueSchema = schema.object({
  key: schema.oneOf([schema.literal('number'), schema.literal('string')]),
  value: schema.conditional(schema.siblingRef('key'), 'number', schema.number(), schema.string()),
});
```

__Notes:__
* Conditional schemas may be hard to read and understand and hence should be used only sparingly.

### References

#### `schema.contextRef()`

Defines a reference to the value specified through the validation context. Context reference is only used as part of a [conditional schema](#schemaconditional) or as a default value for any other schema.

__Output type:__ `TReferenceValue`

__Usage:__
```typescript
const valueSchema = schema.object({ 
  env: schema.string({ defaultValue: schema.contextRef('envName') }),
});
valueSchema.validate({}, { envName: 'dev' });
```

__Notes:__
* The `@kbn/config-schema` neither validates nor coerces the "dereferenced" value and the developer is responsible for making sure that it has the appropriate type.
* The root context that Kibana provides during config validation includes lots of useful properties like `environment name` that can be used to provide a strict schema for production and more relaxed one for development. 

#### `schema.siblingRef()`

Defines a reference to the value of the sibling key. Sibling references are only used a part of [conditional schema](#schemaconditional) or as a default value for any other schema.

__Output type:__ `TReferenceValue`

__Usage:__
```typescript
const valueSchema = schema.object({
  node: schema.object({ tag: schema.string() }),
  env: schema.string({ defaultValue: schema.siblingRef('node.tag') }),
});
```

__Notes:__
* The `@kbn/config-schema` neither validates nor coerces the "dereferenced" value and the developer is responsible for making sure that it has the appropriate type.

## Custom validation

Using built-in schema primitives may not be enough in some scenarios or sometimes the attempt to model complex schemas with built-in primitives only may result in unreadable code.
For these cases `@kbn/config-schema` provides a way to specify a custom validation function for almost any schema building block through the `validate` option.

For example `@kbn/config-schema` doesn't have a dedicated primitive for the `RegExp` based validation currently, but you can easily do that with a custom `validate` function:

```typescript
const valueSchema = schema.string({
    minLength: 3,
    validate(value) {
      if (!/^[a-z0-9_-]+$/.test(value)) {
        return `must be lower case, a-z, 0-9, '_', and '-' are allowed`;
      }
    },
});

// ...or if you use that construct a lot...

const regexSchema = (regex: RegExp) => schema.string({
  validate: value => regex.test(value) ? undefined : `must match "${regex.toString()}"`,
});
const valueSchema = regexSchema(/^[a-z0-9_-]+$/);
```

Custom validation function is run _only after_ all built-in validations passed. It should either return a `string` as an error message
to denote the failed validation or not return anything at all (`void`) otherwise. Please also note that `validate` function is synchronous.

Another use case for custom validation functions is when the schema depends on some run-time data:

```typescript
const gesSchema = randomRunTimeSeed => schema.string({ 
  validate: value => value !== randomRunTimeSeed ? 'value is not allowed' : undefined
});

const schema = gesSchema('some-random-run-time-data');
```

## Default values

If you have an optional config field that you can have a default value for you may want to consider using dedicated `defaultValue` option to not
deal with "defined or undefined"-like checks all over the place in your code. You have three options to provide a default value for almost any schema primitive:

* plain value that's known at the compile time
* [reference](#references) to a value that will be "dereferenced" at the validation time
* function that is invoked at the validation time and returns a plain value

```typescript
const valueSchemaWithPlainValueDefault = schema.string({ defaultValue: 'n/a' });
const valueSchemaWithReferencedValueDefault = schema.string({ defaultValue: schema.contextRef('env') });
const valueSchemaWithFunctionEvaluatedDefault = schema.string({ defaultValue: () => Math.random().toString() });
```

__Notes:__
* `@kbn/config-schema` neither validates nor coerces default value and developer is responsible for making sure that it has the appropriate type.
