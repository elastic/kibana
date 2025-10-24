# @kbn/babel-plugin-lazy-require

Babel plugin that transforms top-level `require()` calls into lazy-loaded getters to reduce memory usage and improve startup time in Jest tests.

## Problem Statement

Barrel files (files that aggregate and re-export modules) cause performance issues on the server side:
- **CPU consumption**: Importing one module triggers cascading imports of many unused modules
- **Memory usage**: Large require cache and file-level objects stay in memory
- **Babel overhead**: Every required file needs transformation (in dev)
- **Slow tests**: Jest tests become slower as they import more barrel files

This plugin addresses these issues by deferring module loading until actually needed.

## How it Works

The plugin transforms top-level CommonJS `require()` declarations into getter-based lazy loading. The actual module is only loaded when its exports are first accessed.

### Simple Import

**Before:**
```javascript
const foo = require('./foo');
const bar = require('./bar');

console.log('Starting...');
foo.doSomething(); // Both foo and bar already loaded
```

**After:**
```javascript
const _module = { initialized: false, value: undefined };
const _module2 = { initialized: false, value: undefined };
const _imports = {
  get foo() {
    if (!_module.initialized) {
      _module.value = require('./foo');
      _module.initialized = true;
    }
    return _module.value;
  },
  get bar() {
    if (!_module2.initialized) {
      _module2.value = require('./bar');
      _module2.initialized = true;
    }
    return _module2.value;
  }
};

console.log('Starting...'); // Neither module loaded yet
_imports.foo.doSomething(); // Only foo loads here, bar never loads
```

### Destructured Import

**Before:**
```javascript
const { helper, utils } = require('./barrel');

helper(); // Entire barrel file loaded
```

**After:**
```javascript
const _module = { initialized: false, value: undefined };
const _imports = {
  get helper() {
    if (!_module.initialized) {
      _module.value = require('./barrel');
      _module.initialized = true;
    }
    return _module.value.helper;
  },
  get utils() {
    if (!_module.initialized) {
      _module.value = require('./barrel');
      _module.initialized = true;
    }
    return _module.value.utils;
  }
};

_imports.helper(); // Barrel loads once, shared cache for both properties
_imports.utils();  // Uses cached module
```

**Key feature**: Multiple destructured properties from the same module share a single cache, so the module only loads once.

## Usage

This plugin is automatically applied to all Jest tests via the Jest Babel transformer configuration.

### Integration

The plugin is configured in:
```
src/platform/packages/shared/kbn-test/src/jest/transforms/babel/transformer_config.js
```

No code changes are required - all top-level `require()` calls in Jest tests are automatically transformed.

## What Gets Transformed

✅ **Top-level const/let/var with simple require:**
```javascript
const foo = require('./foo');
let bar = require('./bar');
var baz = require('./baz');
```

✅ **Destructured requires:**
```javascript
const { helper, utils } = require('./module');
const { foo: renamed } = require('./other');
```

✅ **All module path types:**
```javascript
const relative = require('./relative');
const parent = require('../parent');
const pkg = require('package-name');
const scoped = require('@scope/package');
const deep = require('package/dist/submodule');
```

## What Does NOT Get Transformed

These patterns are intentionally skipped because they either cannot be safely deferred or are already optimized:

❌ **Dynamic requires:**
```javascript
const path = './dynamic';
const mod = require(path); // Not transformed
```

❌ **Side-effect requires:**
```javascript
require('./setup'); // Not transformed - needs to run immediately
```

❌ **Requires inside functions/blocks:**
```javascript
function load() {
  const foo = require('./foo'); // Not transformed - conditional loading
  return foo;
}
```

❌ **Complex destructuring:**
```javascript
const { foo: { nested } } = require('./mod'); // Not transformed
const [first] = require('./array'); // Not transformed
const { foo, ...rest } = require('./mod'); // Not transformed
const { [key]: value } = require('./mod'); // Not transformed
```

## Benefits

1. **Reduced memory usage**: Only loads modules that are actually used in each test
2. **Faster test startup**: Avoids loading barrel files and their transitive dependencies
3. **Improved test isolation**: Tests only load what they need
4. **Better cache efficiency**: Node's require cache contains fewer unused modules

## Limitations

- **Only works in Jest tests**: Not applied to production code (intentionally)
- **Module-level caching only**: Cannot prevent transitive requires inside the loaded module
- **Small runtime overhead**: Getter calls add minimal overhead (typically negligible)
- **Destructuring loads full module**: `const { foo } = require('./barrel')` still loads the entire barrel, but only when `foo` is accessed

## Examples

### Example 1: Unused Import
```javascript
const utils = require('./expensive-barrel');
const simple = require('./simple');

// Test only uses simple
expect(simple.value).toBe(42);

// Result: 'expensive-barrel' never loads, test runs faster
```

### Example 2: Conditional Usage
```javascript
const heavy = require('./heavy-processing');
const light = require('./light');

if (condition) {
  heavy.process(); // Only loads heavy module if condition is true
} else {
  light.handle(); // Only loads light module otherwise
}
```

### Example 3: Shared Cache
```javascript
const utils = require('./utils');
const { helper } = require('./utils');

// Both share the same module cache
utils.method1(); // Loads './utils' once
helper();        // Uses cached './utils'
```

## Technical Details

### Module Cache Structure

Each unique `require()` path gets one cache object:
```javascript
const _module_xxx = {
  initialized: false,  // Has the module been loaded?
  value: undefined     // The loaded module (once initialized)
};
```

### Imports Object

All transformed imports are accessed through a single `_imports` object with getters:
```javascript
const _imports = {
  get moduleName() {
    if (!_module_xxx.initialized) {
      _module_xxx.value = require('./path');
      _module_xxx.initialized = true;
    }
    return _module_xxx.value;
  }
};
```

### Scope Safety

The plugin correctly handles variable shadowing:
```javascript
const foo = require('./foo');

function test(foo) {
  return foo; // This 'foo' is the parameter, not the import
}
```

## Development

### Running Tests

```bash
yarn jest packages/kbn-babel-plugin-lazy-require
```

### Testing the Plugin

The test suite includes comprehensive coverage of:
- Basic lazy loading behavior
- Destructuring support
- Scope handling
- Edge cases
- Generated code structure

See `src/plugin/lazy_require_plugin.test.ts` for detailed examples.

## Performance Impact

The plugin is designed for Jest tests where:
- Test files import many modules but use only a subset
- Barrel files cause cascading imports
- Startup time matters for test speed

Expected improvements:
- **Memory**: 10-30% reduction in tests with many unused imports
- **Startup**: 20-50% faster for tests importing large barrel files
- **Overhead**: <1% runtime overhead from getter calls (negligible)

## Future Considerations

This is currently a proof-of-concept for Jest tests only. If successful, it could be:
- Extended to other contexts (scripts, dev server)
- Applied per-package for gradual rollout
- Fully enabled for all server-side code

However, careful evaluation of the impact is required before expanding scope.
