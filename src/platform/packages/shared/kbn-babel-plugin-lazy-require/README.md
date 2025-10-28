# @kbn/babel-plugin-lazy-require

Babel plugin that transforms top-level `require()` and `import` statements into lazy-loaded getters, reducing memory usage and improving startup time.

## Problem

Barrel files cause cascading imports of unused modules, increasing:
- Memory usage (large require cache)
- Test startup time (loading unnecessary code)
- CPU overhead (Babel transformations)

**Solution**: Defer module loading until first access.

## How It Works

Transforms imports into getters that load on first access:

### Example

**Before:**
```javascript
const foo = require('./foo');
const bar = require('./bar');
foo.doSomething(); // Both modules already loaded
```

**After:**
```javascript
const _imports = {
  get foo() { /* load ./foo on first access */ },
  get bar() { /* load ./bar on first access */ },
};
_imports.foo.doSomething(); // Only foo loads, bar never loads
```

## Supported Patterns

**Transforms**:
- `const/let/var foo = require('./foo')`
- `import foo from './foo'` (default)
- `import { foo } from './foo'` (named)
- `import * as foo from './foo'` (namespace)
- `const { foo, bar } = require('./foo')` (destructuring)

**Does NOT transform**:
- Dynamic requires: `require(variable)`
- Side effects: `require('./setup')`
- Function-scoped: `function f() { require('./m') }`
- Complex destructuring: `const { a: { b } } = require('./m')`
- Module-level usage: `const x = <Component />`
