# @kbn/babel-plugin-lazy-require

Babel plugin that transforms top-level `require()` and `import` statements into lazy-loaded getters, reducing memory usage and improving Jest test startup time.

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

**Key benefits**:
- Modules load only when accessed
- Shared cache for destructured imports: `const { a, b } = require('./m')` loads once
- ES6 imports supported: `import React, { useState } from 'react'` shares one cache

## Usage

Automatically applied to Jest tests via `src/platform/packages/shared/kbn-test/src/jest/transforms/babel/transformer_config.js`. No code changes needed.

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

## Benefits

- Reduced memory (only load what's used)
- Faster test startup (avoid cascading imports)
- Better isolation (tests load only their dependencies)

## How To Test

```bash
node scripts/jest --config src/platform/packages/shared/kbn-babel-plugin-lazy-require/jest.config.js
```
