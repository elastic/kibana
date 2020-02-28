# @kbn/query-string

This package exists to simply re-export [`query-string`](https://github.com/sindresorhus/query-string)
after transpiling it to something that will be compatible with IE11.

This was necessary because upstream support for older browsers was discontinued
[as of `v6.0.0`](https://github.com/sindresorhus/query-string/releases/tag/v6.0.0), however we
still needed the typedefs & APIs which were added in `v6`.

## Usage
The API is identical to that of `query-string`; you just need to import it from `@kbn/query-string`.

For more detailed documentation, please refer to the project's
[README](https://github.com/sindresorhus/query-string/blob/master/readme.md).

```js
import { parse, stringify } from '@kbn/query-string';

console.log(location.search);
//=> '?foo=bar'

const parsed = parse(location.search);
console.log(parsed);
//=> {foo: 'bar'}

console.log(location.hash);
//=> '#token=bada55cafe'

const parsedHash = parse(location.hash);
console.log(parsedHash);
//=> {token: 'bada55cafe'}

parsed.foo = 'unicorn';
parsed.ilike = 'pizza';

const stringified = stringify(parsed);
//=> 'foo=unicorn&ilike=pizza'

location.search = stringified;
// note that `location.search` automatically prepends a question mark
console.log(location.search);
//=> '?foo=unicorn&ilike=pizza'
```
