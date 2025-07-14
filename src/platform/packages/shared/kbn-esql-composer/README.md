# @kbn/esql-composer


## Basic Usage
A query starts by invoking a source command like `from()`, which returns a `QueryPipeline`. This pipeline can be extended through `.pipe(...)` calls and rendered as a string with `.asQuery()`.

```ts
import { from, where, sort, keep, limit, SortOrder } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('@timestamp >= NOW() - 1 hour'),
    sort({ '@timestamp': SortOrder.Desc }),
    keep('service.name', 'log.level'),
    limit(10)
  )
  .asQuery();
```

The above example will output

```sql
FROM logs-*
  | WHERE @timestamp >= NOW() - 1 hour
  | SORT @timestamp DESC
  | KEEP service.name, log.level
  | LIMIT 10
```

## Output methods

`asQuery()` – outputs the ES|QL query as a readable string.


## Features and examples

### `WHERE`

#### Basic `WHERE` clause

```ts

import { from, where } from '@kbn/esql-composer';

from('logs-*')
  .pipe(where('@timestamp <= NOW() AND @timestamp > NOW() - 24 hours'))
  .asQuery();
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
  .asQuery();
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
  .asQuery();
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
  .asQuery();

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
    stats('?func(??duration), COUNT(??svcName) WHERE agent.name == "java" BY ??env', {
      func: 'AVG',
      duration: 'transaction.duration.us',
      svcName: 'service.name',
      env: 'service.environment',
    })
  )
  .asQuery();
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
  .asQuery();

```

`EVAL`  with named parameters for dynamic field names

```ts
import { from, evaluate } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    evaluate('latestTs = MAX(??ts)', {
      ts: '@timestamp',
    })
  )
  .asRequest();
```

Output: 

```sql
  FROM logs-*
  | EVAL latestTs = MAX(@timestamp)
```


### `SORT`


`SORT` by string fields (ASC by default)

```ts
import { from, sort } from '@kbn/esql-composer';

from('logs-*')
  .pipe(sort('@timestamp', 'log.level'))
  .asQuery();
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
  .asQuery();
```
Output:

```sql
  FROM logs-*
  | SORT @timestamp DESC
```


`SORT` with named parameters

```ts
import { from, sortRaw } from '@kbn/esql-composer';

from('logs-*')
  .pipe(
    sortRaw('??timestamp DESC, ??logLevel ASC', {
      timestamp: '@timestamp',
      logLevel: 'log.level',
    })
  )
  .asRequest();
```

Output:

```sql
  FROM logs-*
  | SORT @timestamp DESC, log.level ASC
```
