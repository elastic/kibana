Kibana elastic-idx Library
==========================

The `@kbn/elastic-idx` package provides the `idx` function used for optional
chaining.  Currently, the optional chaining draft is in stage 1, making it too
uncertain to add syntax support within Kibana.  Other optional chaining
libraries require the Proxy object to be polyfilled for browser support,
however, this polyfill is not fully supported across all browsers that Kibana
requires.  The facebookincubator `idx` project
(https://github.com/facebookincubator/idx) provides an answer to this with a
specific implementation that is understood by TypeScript so that type
information does not get lost (unlike lodash get) The `@kbn/elastic-idx`
library makes use the `idx` idiom but differs in the way null values within the
property chain are handled.

Similar to the facebookincubator `idx` project, `@kbn/elastic-idx` also
provides the Babel plugin to transform `idx()` function calls into the expanded
form.  This Babel plugin was based off the facebookincubator `idx` Babel
plugin, since the invocation syntax is almost identical, but the transformed
code differs to match how the `@kbn/elastic-idx` library treats null values.

App Usage
----------
Within Kibana, `@kbn/elastic-idx` can be imported and used in any JavaScript or
TypeScript project:

```
import { idx } from '@kbn/elastic-idx';

const obj0 = { a: { b: { c: { d: 'iamdefined' } } } };
const obj1 = { a: { b: null } };

idx(obj0, _ => _.a.b.c.d); // returns 'iamdefined'
idx(obj1, _ => _.a.b.c.e); // returns undefined
idx(obj1, _ => _.a.b); // returns null
```

Build Optimization
-------------------
Similar to the facebookincubator `idx` project, it is NOT RECOMMENDED to use
idx in shipped app code.  The implementation details which make
`@kbn/elastic-idx` possible comes at a non-negligible performance cost.  This
usually isn't noticable during development, but for production builds, it is
recommended to transform idx calls into native, expanded form JS.  Use the
plugin `@kbn/elastic-idx/babel` within your Babel configuration:

```
{ "plugins": [ "@kbn/elastic-idx/babel" ] }
```

The resulting Babel transforms the following:

```
import { idx } from '@kbn/elastic-idx';
const obj = { a: { b: { c: { d: 'iamdefined' } } } };
idx(obj, _ => _.a.b.c.d);
```

into this:

```
obj != null &&
obj.a != null &&
obj.a.b != null &&
obj.a.b.c != null ?
obj.a.b.c.d : undefined
```

Note that this also removes the import statement from the source code, since it
no longer needs to be bundled.

Testing
--------

Tests can be run with `npm test`. This includes "functional" tests that
transform and evaluate idx calls.
