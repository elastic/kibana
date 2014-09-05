| Private | module id |
| --- | --- |
| `true` | `components/agg_config/index` |

```js
var aggTypes = Private(require('components/agg_types/index'));
```

Collection of `AggType` definition objects. See the [Vis component](../vis) for an overall explaination of how `AggTypes` are used.

### Included

  - [`AggType`](_agg_type.js)
  - `AggParam`
    - [`BaseAggParam`](param_types/base.js)
    - [`FieldAggParam`](param_types/field.js)
    - [`OptionedAggParam`](param_types/optioned.js)
  - [`AggParams`](_agg_params.js)