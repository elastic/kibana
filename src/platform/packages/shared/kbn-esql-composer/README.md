# ESQL Composer for Kibana

>[!WARNING]
> This package is deprecated and will be removed in a future version.
> Please migrate to the Composer API in `@kbn/esql-language`.
> See: [src/platform/packages/shared/kbn-esql-language/src/composer/README.md](../kbn-esql-language/src/composer/README.md)

This package provides a high-level, functional ESQL composer for safely and programmatically building Elasticsearch queries. It serves as a user-friendly abstraction over the `@kbn/esql-language` package.

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
