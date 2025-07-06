# @kbn/eslint-rule-overrides

A shared utility package for managing ESLint rule overrides across the Kibana codebase.

This package allows teams to incrementally adopt stricter ESLint rules in their specific
directories without modifying the central root `.eslintrc.js` file.

## Purpose

This package helps teams:

- Add additional restricted imports to their specific directories
- Inherit and extend root-level ESLint configurations
- Maintain consistency while allowing for gradual rule adoption
- Avoid conflicts when modifying the root `.eslintrc.js` file

## Installation

This package is part of the Kibana monorepo and should be available after running:

```bash
yarn kbn bootstrap
```

## Usage

Import and use this package directly in your local `.eslintrc.js` file:

```javascript
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createNoRestrictedImportsOverride({
    restrictedImports: [
      // Simple string restriction
      'lodash',

      // Object with custom message
      {
        name: 'react-router-dom',
        message: 'Please use @kbn/shared-ux-router instead',
      },

      // Restrict specific named imports
      {
        name: '@emotion/react',
        importNames: ['css', 'jsx'],
        message: 'Use @emotion/css instead for better performance',
      },
    ],
  }),
};
```

## How It Works

1. **Discovers Root Config**: Uses git to find the repository root and loads the main `.eslintrc.js`
2. **Finds Applicable Rules**: Identifies existing `no-restricted-imports` rules in the root config
3. **Merges Restrictions**: Adds your additional restricted imports to the existing ones
4. **Filters by Directory**: Returns only the overrides that apply to your current directory
5. **Preserves Configuration**: Maintains all other ESLint settings from the root config

## API

### `createNoRestrictedImportsOverride(options)`

Creates ESLint override configurations that extend the root `no-restricted-imports` rules.

#### Parameters

- `options` (Object)
  - `restrictedImports` (Array) - List of imports to restrict. Each item can be:
    - A string (module name)
    - An object with:
      - `name` (string) - Module name to restrict
      - `message` (string, optional) - Custom error message
      - `importNames` (string[], optional) - Specific named imports to restrict
      - `allowImportNames` (string[], optional) - Named imports to allow (restricts all others)

#### Returns

An array of ESLint override configurations that can be spread into your local `.eslintrc.js` overrides.

## Examples

### Basic Usage

```javascript
// packages/my-plugin/.eslintrc.js
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createNoRestrictedImportsOverride({
    restrictedImports: ['moment', 'jquery'],
  }),
};
```

### Advanced Usage with Multiple Restriction Types

```javascript
// x-pack/plugins/my-feature/.eslintrc.js
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createNoRestrictedImportsOverride({
    restrictedImports: [
      // Restrict entire module
      'lodash',

      // Restrict with custom message
      {
        name: 'moment',
        message: 'Use @kbn/datemath or native Date instead',
      },

      // Restrict specific exports
      {
        name: 'react-use',
        importNames: ['useAsync', 'useMount'],
        message: 'Use React built-in hooks or @kbn/react-hooks',
      },

      // Allow only specific exports
      {
        name: '@elastic/charts',
        allowImportNames: ['Chart', 'Settings'],
        message: 'Only Chart and Settings are approved for use',
      },
    ],
  }),
};
```

## Important Notes

- This package requires the repository to be a git repository (uses `git rev-parse`)
- The root `.eslintrc.js` must be in the repository root
- Only overrides that apply to your current directory will be returned
- Duplicate restrictions are automatically deduplicated
- The package preserves the severity level (error/warn) from the root configuration

## Troubleshooting

If you encounter issues:

1. Ensure you've run `yarn kbn bootstrap`
2. Verify you're in a git repository
3. Check that the root `.eslintrc.js` exists and is valid
4. Ensure you're providing at least one restricted import
