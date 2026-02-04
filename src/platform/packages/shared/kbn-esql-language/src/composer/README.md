# ES|QL Composer API

ES|QL query composer with a focus on secure input processing and developer
experience. This builder allows developers to conveniently and in a
injection-safe way build ES|QL queries.

```ts
// Old approach: String concatenation (unsafe)
const oldString = `FROM logs | WHERE user == "${userName}" | LIMIT ${limit}`;

// New approach: ES|QL Composer (safe) - `esql` is a tagged template literal;
// which correctly processes `${{userName}}` as a parameter hole and creates
// a parametrized query object.
const newQueryObject = esql`
  FROM logs | WHERE user == ${{ userName }} | LIMIT ${limit}`;
```

## Getting started

To get started import the `esql` tag from ES|QL AST package. The example below
shows a dynamic parameter `param` received externally (maybe from user input),
the parameter can be inserted in to the query using the `${{ param }}` syntax,
it will be correctly treated when the query AST is constructed:

```ts
import { esql } from '@kbn/esql-language';

const param = 123; // Dynamic parameter, e.g. received from the UI.

const query = esql`
  FROM index
    | WHERE @timestamp >= ${{ param }}
    | SORT @timestamp DESC
    | KEEP service.name, log.level`;
```

You can then "pipe" more commands to the query using the `.pipe` tag:

```ts
query.pipe`LIMIT 10`;
```

Your query is stored as a parsed AST together with the parameter map in the
`query` object. You can dump the contents of the query by simply casting it
to a string:

```ts
console.log(query + '');

// ComposerQuery
// ├─ query
// │  └─ FROM index
// │       | WHERE @timestamp >= ?param
// │       | SORT @timestamp DESC
// │       | KEEP service.name, log.level
// │       | LIMIT 10
// │
// └─ params
//    └─ param: 123
```

Note that `${{ param }}` was a tagged template hole, the param was extracted
into a separate `params` map, which can be safely sent to Elasticsearch as part
of the request.

You can pretty-print the query using the `.print()` method:

```ts
query.print();

// FROM index
//   | WHERE @timestamp >= ?input
//   | SORT @timestamp DESC
//   | KEEP service.name, log.level
//   | LIMIT 10
```

And you can convert the query to a request object that contains the query
text and the parameters map:

```ts
query.toRequest();
// Output:
// { query: 'FROM index | ...', params: {} }

// Params are captured from tagged templates
query.toRequest().params; // [{ input : 123 }]
```

## Conditionally add commands

The simplest way to conditionally add commands to a query is to first construct
the base `query` object and then use `.pipe` to add commands based on
conditions:

```ts
// Build query conditionally
let query = esql`FROM index`;

if (includeFilters) {
  query = query.pipe`WHERE foo > 42`;
}

query = query.limit(10); // or: query.pipe `LIMIT 10`;
```

Another approach is to inline conditional command into the original query
using command holes. You can manually insert a no-op command `WHERE TRUE` or
use the `esql.nop` helper:

```ts
// Build query with conditional command hole
const query = esql`FROM index
  | ${includeFilters ? esql.cmd`WHERE foo > 42` : esql.nop}
  | LIMIT 10`;

// same as:
const query = esql`FROM index
  | ${includeFilters ? esql.cmd`WHERE foo > 42` : esql.cmd`WHERE TRUE`}
  | LIMIT 10`;
```

The `WHERE TRUE` commands are automatically removed from the final AST, so the
resulting query does not contain any no-op commands. However, even if they
were present, Elasticsearch would simply ignore them.

## API Reference

### Basic Usage Patterns

The `esql` tag function supports multiple usage patterns for different scenarios:

#### Tagged Template Syntax

```ts
// Static query
const query = esql`FROM index | WHERE foo > 42 | LIMIT 10`;

// Dynamic values (inlined)
const threshold = 100;
const query = esql`FROM index | WHERE count > ${threshold}`;

// Dynamic values with parameters (recommended for security)
const userInput = 'admin';
const query = esql`FROM logs | WHERE user.name == ${esql.par(userInput)}`;
```

#### String Constructor

```ts
// From string with named parameters
const query = esql('FROM index | WHERE count > ?threshold | LIMIT ?limit', {
  threshold: 100,
  limit: 25,
});

// Pre-parameterized function
const builder = esql({ defaultLimit: 10 });
const query = builder`FROM index | LIMIT ?defaultLimit`;
```

### Parameter Handling

ES|QL Composer provides multiple ways to handle dynamic parameters securely:

#### Explicit Parameters

```ts
// Named parameter
const query = esql`FROM index | WHERE field > ${esql.par(value, 'threshold')}`;

// Auto-generated parameter name
const query = esql`FROM index | WHERE field > ${esql.par(value)}`;
// Generates: WHERE field > ?p0
```

#### Shorthand Object Syntax

```ts
// Single parameter per object (enforced by TypeScript)
const limit = 100;
const field = 'user.name';
const query = esql`FROM index | LIMIT ${{ limit }} | KEEP ${{ field }}`;
// Generates: FROM index | LIMIT ?limit | KEEP ?field
```

#### Pre-defined Parameters

```ts
// Define parameters upfront
const query = esql({
  startTime: '2024-01-01',
  environment: 'production',
})`
  FROM logs-*
  | WHERE @timestamp >= ?startTime
  | WHERE env == ?environment
`;
```

### Core Methods

#### `.pipe()` - Append Commands

The primary method for "piping" additional commands to the query:

```ts
// Template literal syntax
query.pipe`WHERE status == "error"`;
query.pipe`LIMIT ${maxResults}`;

// String syntax (use it as the last resort)
query.pipe('SORT @timestamp DESC');
```

#### Built-in Command Methods

Convenience methods for common ES|QL commands:

```ts
// LIMIT command
query.limit(100);

// KEEP command
query.keep('field1', 'field2', ['nested', 'field']);

// DROP command
query.drop('field1', 'field2');

// SORT command
query.sort('@timestamp');
query.sort(['@timestamp', 'DESC', 'NULLS LAST']);
query.sort(['field1', 'ASC'], ['field2', 'DESC']);

// WHERE command (supports template literals)
query.where`status == ${status} AND count > ${threshold}`;
```

You can chain them fluently:

```ts
const query = esql.from('index').where`status == ${status}`
  .sort(['@timestamp', 'DESC'])
  .keep('field1', 'field2')
  .limit(50);
```

#### SET Header Instructions

ES|QL supports SET instructions at the beginning of queries to configure query-level settings. You can add SET instructions either directly in the template or programmatically:

```ts
// Direct in template (recommended)
const query = esql`SET a = 123; FROM index | LIMIT 10`;

// Multiple SET instructions
const query = esql`
  SET threshold = 100;
  SET limit = 50;
  FROM logs | WHERE value > ?threshold | LIMIT ?limit`;

// Programmatically add SET instructions
const query = esql`FROM index | LIMIT 10`;
query.addSetCommand('setting1', 'value1');
query.addSetCommand('setting2', 42);
query.addSetCommand('setting3', true);

// Get all SET instructions
const sets = query.getSetCommands();
// Returns: [{ name: 'setting1', value: '"value1"' }, ...]

// Remove specific SET instruction
query.removeSetCommand('setting2');

// Clear all SET instructions
query.clearSetCommands();
```

SET instructions support string, numeric, and boolean values and are preserved when combining queries or adding more commands.

#### Output Methods

```ts
// Get query string (formatted)
query.print(); // Multi-line, indented format (default)
query.print('basic'); // Single-line format
query.print('wrapping'); // Multi-line, indented format

// Get Elasticsearch request object
const request = query.toRequest();
// Returns: { query: string, params: Array<Record<string, unknown>> }

// Get parameters as object
const params = query.getParams();
// Returns: Record<string, unknown>

// Debug representation
console.log(query + '');
// Outputs tree structure with query and parameters
```

#### Parameter Management

```ts
// Add parameter manually
query.setParam('customParam', 'value');

// Get all parameters
const allParams = query.getParams();

// Inline individual parameter
query.inlineParam('customParam');

// Inline all parameters (convert parameterized query to static query)
query.inlineParams();

// Access AST directly
const ast = query.ast;
```

### Advanced Features

#### Parameter Inlining

The `.inlineParams()` method converts a parameterized query into a static query by replacing all parameter placeholders with their actual values directly in the query text:

```ts
// Create a parameterized query
const query = esql`FROM logs | WHERE user == ${{ userName: 'admin' }} | LIMIT ${{ limit: 100 }}`;

console.log(query.print());
// FROM logs | WHERE user == ?userName | LIMIT ?limit

console.log(query.getParams());
// { userName: 'admin', limit: 100 }

// Inline all parameters
query.inlineParams();

console.log(query.print());
// FROM logs | WHERE user == "admin" | LIMIT 100

console.log(query.getParams());
// {} (empty - all parameters have been inlined)
```

**Inline Individual Parameters:**

```ts
// Inline specific parameters while keeping others parameterized
const query = esql`FROM logs | WHERE user == ${{ userName: 'admin' }} AND level == ${{
  level: 'error',
}}`;

query.inlineParam('userName'); // Inline only the userName parameter

console.log(query.print());
// FROM logs | WHERE user == "admin" AND level == ?level

console.log(query.getParams());
// { level: 'error' }
```

**Supported Parameter Types:**

- `string` - Converted to string literals with proper escaping
- `number` - Converted to numeric literals
- `boolean` - Converted to boolean literals
- Column names (when used with `??` param syntax)
- Nested column name parts (both `?` and `??` param syntax)
- Function names (both `?` and `??` param syntax)

**Important Notes:**

- Inlining is irreversible - parameters cannot be extracted back
- The parameter map is cleared after inlining all parameters
- Type validation ensures only supported types can be inlined
- Special handling for column names and function identifiers

#### Dynamic Query Construction

```ts
// Conditional commands
let query = esql`FROM logs-*`;

if (timeFilter) {
  query = query.pipe`WHERE @timestamp >= ${startTime}`;
}

if (includeErrors) {
  query = query.pipe`WHERE log.level == "ERROR"`;
}

query = query.limit(1000);
```

#### Complex Expressions

```ts
// Build complex WHERE conditions
const conditions: [string[], number][] = [
  [['user', 'age'], 25],
  [['account', 'balance'], 1000],
];

let whereClause = esql.exp`TRUE`;
for (const [field, value] of conditions) {
  whereClause = esql.exp`${whereClause} AND ${esql.col(field)} > ${value}`;
}

const query = esql`FROM users`.pipe`WHERE ${whereClause}`;
```

#### Multiple Data Sources

```ts
// Multiple indices
const indices = ['logs-app1-*', 'logs-app2-*'];
const sources = indices.map((index) => esql.src(index));
const query = esql`FROM ${sources}`;

// Using convenience method
const query = esql.from('logs-app1-*', 'logs-app2-*');

// Using convenience method with metadata fields
const query = esql.from(['logs-app1-*', 'logs-app2-*'], ['_id', '_index']);
```

### Column References

ES|QL Composer automatically handles column escaping and nested field references:

```ts
// Simple column
query.keep('fieldName');

// Nested column (dot notation)
query.keep(['user', 'name']); // user.name
query.keep(['order', 'items', 'id']); // order.items.id

// Columns with special characters (auto-escaped)
query.keep('field-with-dashes'); // `field-with-dashes`
query.keep('field with spaces'); // `field with spaces`
```

### Sort Expressions

Multiple formats supported for sort specifications:

```ts
// Simple column name
query.sort('@timestamp');

// With direction
query.sort(['@timestamp', 'DESC']);

// With direction and null handling
query.sort(['@timestamp', 'DESC', 'NULLS LAST']);

// Multiple sort expressions
query.sort(['@timestamp', 'DESC'], ['user.name', 'ASC', 'NULLS FIRST'], 'priority');
```

### Error Handling

```ts
try {
  // Invalid ES|QL syntax will throw during construction
  const query = esql`FROM index | INVALID_COMMAND`;
} catch (error) {
  console.error('Invalid ES|QL syntax:', error.message);
}

// Parameter validation
try {
  // Invalid parameter names throw errors
  esql`FROM index | WHERE field > ${esql.par(value, '123invalid')}`;
} catch (error) {
  console.error('Invalid parameter name:', error.message);
}
```

### Best Practices

#### Security

```ts
// ✅ Good: Use parameters for user input
const userQuery = esql`FROM logs | WHERE user == ${{ userName }}`;

// ✅ Good: Use AST composition
const userQuery = esql`FROM logs | WHERE user == ${userName}`;

// ❌ Bad: Direct interpolation using string syntax
const userQuery = esql(`FROM logs | WHERE user == "${userName}"`);
```

### Helper Methods and Utilities

The `esql` object provides additional helper methods for building expressions and AST nodes:

#### Expression Builders

```ts
// Import esql from the AST package
import { esql } from '@kbn/esql-language';

// Column expressions
esql.col('field_name'); // Simple column
esql.col(['user', 'name']); // Nested column (user.name)

// Literal expressions
esql.str('text value'); // String literal
esql.int(42); // Integer literal
esql.bool(true); // Boolean literal

// Source expressions
esql.src('index_name'); // Source/index reference
```

### Debugging and Inspection

#### Query Introspection

```ts
const query = esql`FROM logs | WHERE level == "ERROR" | LIMIT 100`;

// Access the parsed AST
console.log(query.ast);
// Returns: ESQLAstQueryExpression object

// Get parameter information
console.log(query.getParams());
// Returns: Record<string, unknown>

// Debug output with tree structure
console.log(query.toString());
// or
console.log(query + '');
```

#### Pretty Printing Options

```ts
// Formatted output (default)
query.print();
// FROM logs
//   | WHERE level == "ERROR"
//   | LIMIT 100

// Single line output
query.print('basic');
// FROM logs | WHERE level == "ERROR" | LIMIT 100

// Explicit wrapping format
query.print('wrapping');
// FROM logs
//   | WHERE level == "ERROR"
//   | LIMIT 100
```

### Integration with Elasticsearch

#### Request Format

The `.toRequest()` method returns an object compatible with Elasticsearch's `_query` endpoint:

```ts
const query = esql`FROM logs | WHERE user == ${esql.par('admin', 'username')} | LIMIT 100`;

const request = query.toRequest();
console.log(request);
// Output:
// {
//   query: "FROM logs | WHERE user == ?username | LIMIT 100",
//   params: [{ username: "admin" }]
// }
```

#### Parameter Format

Parameters are formatted as an array of objects, where each object contains one key-value pair:

```ts
const query = esql`FROM logs | WHERE user == ${esql.par('john')} AND age > ${esql.par(25)}`;

console.log(query.toRequest().params);
// [{ p0: "john" }, { p1: 25 }]
```

### Troubleshooting

#### Common Issues

```ts
// Issue: Parameter naming conflicts
// ❌ This will auto-rename the second parameter
const problematic = esql`
  FROM logs 
  | WHERE field1 == ${{ value: 'test' }} 
  | WHERE field2 == ${{ value: 'other' }}
`;
// Second parameter becomes ?p1

// ✅ Solution: Use explicit names
const fixed = esql`
  FROM logs 
  | WHERE field1 == ${{ value1: 'test' }} 
  | WHERE field2 == ${{ value2: 'other' }}
`;
// or
const fixed = esql`
  FROM logs 
  | WHERE field1 == ${esql.par('test', 'value1')} 
  | WHERE field2 == ${esql.par('other', 'value2')}
`;
```

```ts
// Issue: Invalid parameter names
// ❌ Parameter names cannot start with digits
try {
  esql`FROM logs | WHERE field == ${esql.par('value', '123param')}`;
} catch (error) {
  console.error(error.message); // Invalid parameter name "123param"
}

// ✅ Solution: Use valid identifiers
const valid = esql`FROM logs | WHERE field == ${esql.par('value', 'param123')}`;
```

### Validation and Type Safety

When a Composer query is constructed, the holes are processed and a query text
is generated, which is then parsed using the ANTLR parser. This ensures that the
query is valid ES|QL syntax and that parameters are correctly handled.

Some notes on type safety in the ES|QL Composer API:

```ts
// TypeScript will enforce parameter object structure
const query = esql`FROM index | LIMIT ${{ limit: 100 }}`; // ✅ Valid
const query = esql`FROM index | LIMIT ${{ limit: 100, other: 200 }}`; // ❌ Type error

// Method chaining is properly typed
const query = esql`FROM index`
  .limit(100) // ✅ Returns ComposerQuery
  .keep('field') // ✅ Returns ComposerQuery
  .invalidMethod(); // ❌ Type error

// Parameter types are validated
esql`FROM logs | WHERE count > ${esql.par(123, 'threshold')}`; // ✅ Valid
esql`FROM logs | WHERE count > ${esql.par(123, 123)}`; // ❌ Type error
esql`FROM logs | WHERE count > ${esql.par(123, '')}`; // ❌ Runtime error
```
