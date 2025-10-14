# ESQL Composer for Kibana

This package provides a high-level, functional ESQL composer for safely and programmatically building Elasticsearch queries. It serves as a user-friendly abstraction over the `@kbn/esql-ast` package.

This ESQL composer is designed to be used by importing individual command functions (`from`, `where`, `stats`, etc.) and chaining them together to form a query pipeline.

## Basic Usage
A query starts by invoking a source command like `from()`, which returns a `QueryPipeline`. This pipeline can be extended through `.pipe(...)` calls and rendered as a string with `.toString()` or request object with `asRequest`.

```ts
import { from, where, sort, keep, limit, SortOrder } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('@timestamp >= NOW() - 1 hour'),
    sort({ '@timestamp': SortOrder.Desc }),
    keep('service.name', 'log.level'),
    limit(10)
  )
  .toString();
```

The above example will output

```sql
FROM logs-*
  | WHERE @timestamp >= NOW() - 1 hour
  | SORT @timestamp DESC
  | KEEP service.name, log.level
  | LIMIT 10
```

```ts
import { from, where, sort, keep, limit, SortOrder } from '@kbn/esql-composer';
const query = from('logs-*')
  .pipe(
    where('@timestamp >= NOW() - 1 hour AND service.environment == ?svcEnv', {
      svcEnv: 'production'
    }),
    sort({ '@timestamp': SortOrder.Desc }),
    keep('service.name', 'log.level'),
    limit(10)
  )
  .asRequest();
```

The above example will output

```ts
{ 
  query: `FROM logs-*
  | WHERE @timestamp >= NOW() - 1 hour AND service.environment == ?svcEnv
  | SORT @timestamp DESC
  | KEEP service.name, log.level
  | LIMIT 10
  `,
  params: [{ svcEnv: 'production' }]
}
```

### Conditional commands


```ts

import { from, where, sort, keep, limit, SortOrder } from '@kbn/esql-composer';


const limitReturnedFields = req.query('limitReturnedFields')
let pipelipine = from('logs-*').pipe(
  where('@timestamp <= NOW() AND @timestamp > NOW() - 24 hours'),
  limit(10s)
);

if (limitReturnedFields) {
  pipeline = pipeline.pipe(keep('@timestamp', 'service.name'))
}

pipeline.toString()

// OR

let pipelipine = from('logs-*').pipe(
  where('@timestamp <= NOW() AND @timestamp > NOW() - 24 hours'),
  limit(10s)
).pipe(limitReturnedFields ? keep('@timestamp', 'service.name') : (query) => query);

pipeline.toString()

```

The above example will output 

- if `limitReturnedFields` is `true`

```sql
FROM logs-*
  | WHERE @timestamp >= NOW() - 1 hour
  | LIMIT 10
  | KEEP @timetsamp, service.name
```
- if `limitReturnedFields` is `false`

```sql
FROM logs-*
  | WHERE @timestamp >= NOW() - 1 hour
  | LIMIT 10
```

## Output methods

`toString()` – outputs the ES|QL query as a readable string.
`asRequest()` – outputs an object for Elasticsearch’s ES|QL query API, including parameters.


## Example of commands

### `WHERE`

#### Basic `WHERE` clause

```ts

import { from, where } from '@kbn/esql-composer';

from('logs-*')
  .pipe(where('@timestamp <= NOW() AND @timestamp > NOW() - 24 hours'))
  .toString();
```

Output: 

```sql
  FROM logs-*
  | WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours
```

#### `WHERE` with named parameters

```ts
import { from, where } from '@kbn/esql-composer';

from('logs-*')
  .pipe(where('host.name == ?hostName AND service.name == ?serviceName', 
    {
      hostName: 'my-host',
      serviceName: 'my-service'
    }
  ))
  .toString();
```

Output: 

```sql
  FROM logs-*
  | WHERE host.name == "my-host" AND service.name == "my-service"
```

#### `WHERE` with positional parameters

```ts
import { from, where } from '@kbn/esql-composer';

from('logs-*')
  .pipe(where('host.name IN (?,?,?)', ['my-host-1', 'my-host-2', 'my-host-3']))
  .toString();
```

Output: 

```sql
  FROM logs-*
  | WHERE host.name IN ("my-host-1", "my-host-2", "my-host-3")
```

### `STATS`

Basic `STATS` clause


```ts
import { from, stats } from '@kbn/esql-composer';

from('logs-*')
  .pipe(stats('avg_duration = AVG(transaction.duration.us) BY service.name'))
  .toString();

```

Output: 

```sql
  FROM logs-*
  | WHERE avg_duration = AVG(transaction.duration.us) BY service.name
```

`STATS` with named parameters for dynamic field and function names

```ts
import { from, stats } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    stats('??funcName(??duration), COUNT(??svcName) WHERE agent.name == "java" BY ??env', {
      funcName: 'AVG',
      duration: 'transaction.duration.us',
      svcName: 'service.name',
      env: 'service.environment',
    })
  )
  .toString();
```

Returns

```sql
  FROM logs-*
  | STATS AVG(transaction.duration.us), COUNT(service.name) WHERE agent.name == "java" BY sevice.environment
```


### `EVAL`

Basic `EVAL` clause

```ts
import { from, evaluate } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    evaluate('type = CASE(languages <= 1, "monolingual",languages <= 2, "bilingual","polyglot")')
  )
  .toString();

```

Output: 

```sql
  FROM logs-*
  | EVAL type = CASE(languages <= 1, "monolingual",languages <= 2, "bilingual","polyglot")
```


### `SORT`


`SORT` by string fields (ASC by default)

```ts
import { from, sort } from '@kbn/esql-composer';

from('logs-*')
  .pipe(sort('@timestamp', 'log.level'))
  .toString();
```

Output: 

```sql
  FROM logs-*
  | SORT @timestamp, log.level ASC
```

`SORT` with explicit order

```ts

import { from, evaluate } from '@kbn/esql-composer';

from('logs-*')
  .pipe(sort({ '@timestamp': SortOrder.Desc }))
  .toString();
```
Output:

```sql
  FROM logs-*
  | SORT @timestamp DESC
```


`SORT` with named parameters

```ts
import { from, sort } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    sort('??timestamp DESC, ??logLevel ASC', {
      timestamp: '@timestamp',
      logLevel: 'log.level',
    })
  )
  .toString();
```

Output:

```sql
  FROM logs-*
  | SORT @timestamp DESC, log.level ASC
```

## Adding Comments to Commands

You can add comments to any command by passing an `options` parameter with a `comment` property. This is useful for explaining technical preview workarounds, documenting complex queries, or providing context for specific commands.

### Basic Comment Usage

```ts
import { from, stats, evaluate, drop } from '@kbn/esql-composer';

const query = from('metrics-*')
  .pipe(
    stats('AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), host.name')
    evaluate(
      '__DIMENSIONS__ = CONCAT(host.name)',
      undefined,
      { 
        comment: 'Technical preview: This command will be removed in GA' 
      }
    ),
    drop(
      'host.name',
      { comment: 'Clean up original dimension field' }
    )
  );

console.log(query.toString({ withComments: true }));
```

Output:
```sql
FROM metrics-*
  | STATS AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), host.name
  // Technical preview: This command will be removed in GA
  | EVAL __DIMENSIONS__ = CONCAT(host.name)
  // Clean up original dimension field
  | DROP host.name
```

### Comment Support by Command

All commands support the optional `options` parameter with a `comment` property:

- `evaluate(body, params?, options?)` - EVAL command
- `stats(body, params?, options?)` - STATS command
- `where(body, params?, options?)` - WHERE command
- `rename(body, params?, options?)` - RENAME command
- `limit(value, options?)` - LIMIT command
- `drop(...columns, options?)` - DROP command (options must be last argument)
- `keep(...columns, options?)` - KEEP command (options must be last argument)
- `sort(...sorts, options?)` - SORT command (options must be last argument)

### With Parameters

```ts
const query = from('logs-*')
  .pipe(
    stats(
      'avg_duration = ??funcName(??duration) BY service.name',
      { funcName: 'AVG', duration: 'transaction.duration.us' },
      { comment: 'Calculate average duration by service' }
    )
  );
```

### Rendering Comments

By default, `toString()` uses the basic pretty printer which doesn't render comments. To see comments in the output, use the `withComments` option:

```ts
const query = from('logs-*')
  .pipe(evaluate('new_field = old_field * 2', undefined, { comment: 'Calculate doubled value' }));

// Without comments (default behavior)
console.log(query.toString());
// FROM logs-*
//   | EVAL new_field = old_field * 2

// With comments
console.log(query.toString({ withComments: true }));
// FROM logs-*
//   // Calculate doubled value
//   | EVAL new_field = old_field * 2
```

### Backward Compatibility

The comment feature is completely optional and backward compatible. All existing code continues to work unchanged:

```ts
// Works exactly as before
const query = from('logs-*')
  .pipe(stats('count = COUNT(*)'))
  .pipe(evaluate('new_field = old_field * 2'));
```

