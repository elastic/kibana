# @kbn/babel-plugin-lazy-require

Babel plugin that transforms `require()` calls into lazy-loaded getters to reduce memory usage and improve startup time.

## How it works

The plugin transforms top-level CommonJS `require()` declarations into getter-based lazy loading. The actual module is only loaded when its exports are accessed for the first time.

**Before:**
```javascript
const foo = require('./foo');
const bar = require('./bar');

foo.doSomething(); // Both modules loaded immediately
```

**After:**
```javascript
const _foo = { initialized: false };
const _bar = { initialized: false };
const _imports = {
  get foo() {
    if (!_foo.initialized) {
      _foo.value = require('./foo');
      _foo.initialized = true;
    }
    return _foo.value;
  },
  get bar() {
    if (!_bar.initialized) {
      _bar.value = require('./bar');
      _bar.initialized = true;
    }
    return _bar.value;
  }
};

_imports.foo.doSomething(); // Only foo is loaded when accessed
```

## Usage

This plugin is automatically applied via the Babel preset configuration in `@kbn/babel-preset/common_preset`.

## Disabling

Set the environment variable `KIBANA_DISABLE_LAZY_REQUIRE=1` to disable lazy loading and evaluate all requires eagerly.

### What gets transformed

- Top-level `const/let/var` declarations with `require()` calls
- Both relative (`./module`) and external (`lodash`) requires

### What doesn't get transformed

- Dynamic requires: `require(variable)`
- Side-effect requires: `require('module')` (no assignment)
- Non-top-level requires (inside functions or blocks)
