# @kbn/eslint-rule-overrides

A shared utility package for managing ESLint rule overrides across the Kibana codebase. This package allows teams to incrementally adopt stricter ESLint rules in their specific directories without modifying the central root `.eslintrc.js` file.

## Features

- 🎯 **Targeted Overrides**: Apply ESLint rule changes only to specific directories
- 🔄 **Intelligent Merging**: Automatically merges with existing root configuration
- 📦 **TypeScript Support**: Full type safety with comprehensive type definitions
- 🚀 **Zero Configuration**: Works out of the box with sensible defaults
- 🔧 **Flexible API**: Customize behavior with extensive options

## Installation

```bash
yarn add --dev @kbn/eslint-rule-overrides
```

## Basic Usage

Create an `.eslintrc.js` file in any directory where you want to override rules:

```javascript
// x-pack/plugins/security_solution/public/.eslintrc.js
const { createNoRestrictedImportsOverride } = require('@kbn/eslint-rule-overrides');

module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [
    {
      name: 'enzyme',
      message: 'Please use @testing-library/react instead',
    },
    'lodash', // Simple string format also works
  ],
});
```

## API Reference

### `createNoRestrictedImportsOverride(callingDirectory, options)`

Creates an ESLint configuration that intelligently merges additional import restrictions with your root configuration.

#### Parameters

- `callingDirectory` (string, required): The directory where the `.eslintrc.js` file is located. Usually `__dirname`.
- `options` (object, optional): Configuration options

#### Options

| Option                        | Type                                    | Default                  | Description                                  |
| ----------------------------- | --------------------------------------- | ------------------------ | -------------------------------------------- |
| `additionalRestrictedImports` | `Array<string \| RestrictedImportPath>` | `[]`                     | Additional imports to restrict               |
| `rootDir`                     | `string`                                | `process.cwd()`          | Root directory of the project                |
| `rootConfigPath`              | `string`                                | `<rootDir>/.eslintrc.js` | Path to root ESLint config                   |
| `mergeWithExisting`           | `boolean`                               | `true`                   | Whether to merge with existing restrictions  |
| `overrideFilter`              | `function`                              | `undefined`              | Custom filter for which overrides to process |

#### RestrictedImportPath Object

```typescript
interface RestrictedImportPath {
  name: string; // Module name to restrict
  message?: string; // Custom error message
  importNames?: string[]; // Specific named imports to restrict
  allowImportNames?: string[]; // Named imports to allow (restricts all others)
}
```

## Examples

### Basic Import Restriction

```javascript
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [
    'moment', // Restrict all imports from 'moment'
    {
      name: 'lodash',
      message: 'Please use lodash-es for better tree-shaking',
    },
  ],
});
```

### Restricting Specific Named Imports

```javascript
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [
    {
      name: 'react',
      importNames: ['Component', 'PureComponent'],
      message: 'Use functional components with hooks instead',
    },
  ],
});
```

### Allowing Only Specific Imports

```javascript
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [
    {
      name: '@elastic/eui',
      allowImportNames: ['EuiButton', 'EuiModal'], // Only these can be imported
      message: 'Only EuiButton and EuiModal are approved for use',
    },
  ],
});
```

### Custom Override Filter

```javascript
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [{ name: 'axios' }],
  // Only process overrides that don't target test files
  overrideFilter: (override) => {
    return !override.files?.some((f) => f.includes('test'));
  },
});
```

### Replace Instead of Merge

```javascript
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [{ name: 'custom-package' }],
  mergeWithExisting: false, // Replaces all existing restrictions
});
```

## How It Works

1. **Loads Root Config**: The package loads your root `.eslintrc.js` configuration
2. **Finds Relevant Overrides**: Identifies overrides that contain `no-restricted-imports` rules
3. **Merges Restrictions**: Intelligently merges your additional restrictions, removing duplicates
4. **Scopes to Directory**: Filters overrides to only those applicable to the calling directory
5. **Returns Config**: Provides a complete ESLint configuration for the directory

## Best Practices

### 1. Start Small

Begin by adding restrictions to a single directory and gradually expand:

```javascript
// Start in one component directory
// src/plugins/data/public/search/.eslintrc.js
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [{ name: './legacy', message: 'Legacy code is being deprecated' }],
});
```

### 2. Use Descriptive Messages

Always provide clear messages explaining why an import is restricted and what to use instead:

```javascript
{
  name: 'moment',
  message: 'moment is too large. Use @kbn/moment or date-fns instead. See: https://github.com/elastic/kibana/issues/12345',
}
```

### 3. Coordinate with Your Team

Before adding restrictions, ensure your team is aware and has alternatives ready:

```javascript
// Document alternatives in your team's README
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [
    {
      name: 'src/core/public',
      message: 'Import from @kbn/core-plugin/public instead. Migration guide: /docs/migration.md',
    },
  ],
});
```

### 4. Use for Gradual Migration

Perfect for incrementally migrating away from deprecated patterns:

```javascript
// Phase 1: Restrict in new code
// new-features/.eslintrc.js
module.exports = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [{ name: 'old-library' }],
});

// Phase 2: Expand to more directories
// Phase 3: Add to root config when fully migrated
```

## Troubleshooting

### Config Not Loading

If your configuration isn't being applied:

1. Ensure the path to root config is correct:

   ```javascript
   rootConfigPath: path.resolve(__dirname, '../../../../.eslintrc.js');
   ```

2. Verify the calling directory:
   ```javascript
   console.log('Applying overrides to:', __dirname);
   ```

### Duplicate Restrictions

The package automatically deduplicates restrictions by module name. If you're seeing unexpected behavior:

```javascript
// Check what's being merged
const config = createNoRestrictedImportsOverride(__dirname, {
  additionalRestrictedImports: [...],
});
console.log(JSON.stringify(config, null, 2));
```

### Performance Considerations

For large codebases, consider:

1. Using `overrideFilter` to skip unnecessary processing
2. Caching the root config if loading it multiple times

## Future Enhancements

This package is designed to be extensible. Future versions may include:

- Support for other ESLint rules (`no-unused-vars`, `complexity`, etc.)
- Pattern-based import restrictions
- Configuration presets for common scenarios
- CLI tool for managing overrides across the codebase

## Contributing

Contributions are welcome! Please:

1. Add tests for new functionality
2. Update TypeScript types
3. Include examples in documentation
4. Follow the existing code style

## License

This package is part of the Kibana project and follows the same licensing terms.
