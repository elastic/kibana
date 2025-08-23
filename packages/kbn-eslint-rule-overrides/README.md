# @kbn/eslint-rule-overrides

A utility package for inheriting and extending ESLint `no-restricted-imports` rules from Kibana's root configuration into nested directory contexts.

## Purpose

This package enables teams to:

- Inherit all applicable `no-restricted-imports` rules from the root `.eslintrc.js`
- Add additional import restrictions specific to their directory
- Automatically transform file patterns to work correctly in nested contexts
- Maintain consistency with root configuration while allowing local extensions

## How It Works

The package performs several key transformations:

1. **Clones and merges**: Deep clones the root ESLint configuration and merges your additional restricted imports
2. **Filters overrides**: Identifies all overrides containing `no-restricted-imports` rules
3. **Transforms patterns**: Adjusts file glob patterns from root-relative to local-relative paths
4. **Handles negations**: Correctly processes negated patterns, excluding overrides when appropriate
5. **Returns applicable overrides**: Only returns overrides that apply to your nested directory context

### Pattern Transformation Examples

When your `.eslintrc.js` is in `/project/src/components/`:

- `src/components/**/*.js` → `**/*.js`
- `src/components/forms/*.js` → `forms/*.js`
- `src/**/*.js` → `**/*.js`
- `packages/**/*.js` → `null` (excluded - doesn't apply)
- `!src/components/**/*.test.js` → `!**/*.test.js`

## Installation

This package is part of the Kibana monorepo and is available after running:

```bash
yarn kbn bootstrap
```

## Usage

### Basic Usage

```javascript
// src/plugins/my-plugin/.eslintrc.js
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createNoRestrictedImportsOverride({
    childConfigDir: __dirname, // Required: tells the package where this config lives
    restrictedImports: ['lodash', 'moment'],
  }),
};
```

### Advanced Usage

```javascript
// x-pack/plugins/security/.eslintrc.js
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createNoRestrictedImportsOverride({
    childConfigDir: __dirname,
    restrictedImports: [
      // Simple string restriction
      'lodash',

      // Restriction with custom message
      {
        name: 'moment',
        message: 'Use @kbn/datemath or @elastic/eui/lib/services/format instead',
      },

      // Restrict specific named imports
      {
        name: 'react-router-dom',
        importNames: ['Route', 'Switch'],
        message: 'Use @kbn/shared-ux-router instead',
      },

      // Allow only specific imports (restrict all others)
      {
        name: '@elastic/charts',
        allowImportNames: ['Chart', 'Settings', 'Axis'],
        message: 'Only Chart, Settings, and Axis are approved for use',
      },
    ],
  }),
};
```

## API Reference

### `createNoRestrictedImportsOverride(options)`

Creates ESLint override configurations that inherit and extend root `no-restricted-imports` rules.

#### Parameters

- **`options`** _(Object)_ - Configuration object with the following properties:
  - **`childConfigDir`** _(string, required)_ - Directory path where your `.eslintrc.js` is located. Pass `__dirname`.
  - **`restrictedImports`** _(Array, required)_ - Additional imports to restrict. Each item can be:
    - **String**: Module name to restrict entirely
    - **Object**: Advanced restriction with properties:
      - `name` _(string)_ - Module name to restrict
      - `message` _(string, optional)_ - Custom error message
      - `importNames` _(string[], optional)_ - Specific named imports to restrict
      - `allowImportNames` _(string[], optional)_ - Named imports to allow (restricts all others)

#### Returns

An array of ESLint override configurations with:

- Merged `no-restricted-imports` rules (root + your additions)
- Transformed file patterns relative to your directory
- All other rule settings preserved from root configuration

#### Throws

- Error if `childConfigDir` is not provided
- Error if `restrictedImports` is empty or not provided

## Pattern Transformation Behavior

### Files Patterns

The package intelligently transforms `files` patterns based on your directory context:

1. **Applicable patterns**: Transformed to be relative to your directory
2. **Non-applicable patterns**: Override is excluded entirely
3. **Negated patterns**:
   - If excluding your entire directory → override excluded
   - If excluding specific files/subdirs → pattern transformed

### ExcludedFiles Patterns

`excludedFiles` patterns are transformed without special negation handling, preserving their exclusion semantics.

### Examples

For a config in `/project/src/components/`:

| Root Pattern                   | Transformed     | Notes                    |
| ------------------------------ | --------------- | ------------------------ |
| `src/components/**/*.js`       | `**/*.js`       | Applies to all JS files  |
| `src/components/Button.js`     | `Button.js`     | Specific file            |
| `!src/components/**`           | `null`          | Excludes entire override |
| `!src/components/**/*.test.js` | `!**/*.test.js` | Excludes test files only |
| `packages/**/*.js`             | `null`          | Different directory tree |

## Deduplication Behavior

When the same module is restricted in both root config and your local config:

- **String + String**: Your restriction takes precedence
- **Object + String**: Your restriction replaces the root's
- **String + Object**: Your object configuration takes precedence
- **Object + Object**: Your configuration completely replaces the root's

## Real-World Example

```javascript
// x-pack/plugins/security/public/.eslintrc.js
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createNoRestrictedImportsOverride({
    childConfigDir: __dirname,
    restrictedImports: [
      // Prevent usage of legacy router
      {
        name: 'react-router-dom',
        message: 'Please use @kbn/shared-ux-router for routing',
      },
      // Prevent direct lodash usage
      {
        name: 'lodash',
        message: 'Use native ES or @kbn/std instead',
      },
      // Allow only specific EUI exports
      {
        name: '@elastic/eui',
        allowImportNames: ['EuiButton', 'EuiModal', 'EuiText'],
        message: 'Only approved EUI components can be used in Security',
      },
    ],
  }),
};
```

## Troubleshooting

### Common Issues

1. **"No childConfigDir provided"**

   - Solution: Pass `__dirname` as the `childConfigDir` parameter

2. **"No restricted imports provided"**

   - Solution: Ensure `restrictedImports` array has at least one item

3. **Override not applying**

   - Check if the file pattern from root config actually matches your directory
   - Use `--debug` flag with ESLint to see which overrides are active

4. **Patterns not transforming correctly**
   - Ensure your `childConfigDir` path is absolute (use `__dirname`)
   - Check that root `.eslintrc.js` has valid patterns

### Debug Tips

To see what overrides are being generated:

```javascript
const overrides = createNoRestrictedImportsOverride({
  childConfigDir: __dirname,
  restrictedImports: ['lodash'],
});

console.log(JSON.stringify(overrides, null, 2));
```

## Contributing

When modifying this package:

1. Run tests: `yarn test:jest packages/kbn-eslint-rule-overrides`
2. Ensure pattern transformation works correctly for nested contexts
3. Test with real `.eslintrc.js` files in various directory depths
4. Verify negation patterns behave correctly

## License

See Kibana's main LICENSE file for licensing information.
