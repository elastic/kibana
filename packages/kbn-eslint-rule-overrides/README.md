# @kbn/eslint-rule-overrides

A utility package for inheriting and customizing ESLint rules from Kibana's root configuration into nested directory contexts.

## Purpose

This package enables teams to:

- Inherit all applicable ESLint rules from the root `.eslintrc.js`
- Customize rules with different strategies (merge, replace, remove, append, prepend)
- Add additional restrictions or modify severity levels
- Automatically transform file patterns to work correctly in nested contexts
- Maintain consistency with root configuration while allowing local customization

## How It Works

The package performs several key transformations:

1. **Clones and processes**: Deep clones the root ESLint configuration and applies your rule customizations
2. **Applies strategies**: Each rule can use different strategies for how it modifies the root config
3. **Filters overrides**: Returns only overrides containing the rules you're customizing
4. **Transforms patterns**: Adjusts file glob patterns from root-relative to local-relative paths
5. **Handles negations**: Correctly processes negated patterns, excluding overrides when appropriate

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
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname, // Required: tells the package where this config lives
    rules: {
      // Simple merge strategy (default)
      'no-restricted-imports': ['lodash', 'moment'],
    },
  }),
};
```

### Advanced Usage with Strategies

```javascript
// x-pack/plugins/security/.eslintrc.js
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      // Merge additional restricted imports with optional severity change
      'no-restricted-imports': {
        strategy: 'merge',
        severity: 'error', // Optional: change from warn to error
        value: [
          'lodash',
          {
            name: 'moment',
            message: 'Use @kbn/datemath instead',
          },
        ],
      },

      // Completely replace a rule
      'no-console': {
        strategy: 'replace',
        value: ['error', { allow: ['warn', 'error'] }],
      },

      // Remove a rule entirely
      'no-debugger': {
        strategy: 'remove',
      },

      // Prepend items (for rules that support arrays like no-restricted-imports)
      'no-restricted-imports': {
        strategy: 'prepend',
        value: ['react-router'], // Will be added at the beginning
      },
    },
  }),
};
```

### Custom Handler for Special Cases

```javascript
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      'my-custom-rule': {
        strategy: 'merge',
        value: ['error', { customOption: true }],
        customHandler: {
          process(config, ruleConfig, context) {
            // Custom processing logic for rules not yet supported
            // config: cloned ESLint config to modify
            // ruleConfig: { strategy, value, severity }
            // context: { rootDir, childConfigDir, ruleName }
          },
        },
      },
    },
  }),
};
```

### no-restricted-imports Specific Examples

The package has built-in intelligent handling for `no-restricted-imports`:

```javascript
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      'no-restricted-imports': {
        strategy: 'merge', // Intelligently merges with deduplication
        severity: 'error', // Upgrade from warn to error
        value: [
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
      },
    },
  }),
};
```

## API Reference

### `createRuleOverrides(options)`

Creates ESLint override configurations that inherit and customize root rules.

#### Parameters

- **`options`** _(Object)_ - Configuration object with the following properties:
  - **`childConfigDir`** _(string, required)_ - Directory path where your `.eslintrc.js` is located. Pass `__dirname`.
  - **`rules`** _(Object, required)_ - Rules to customize. Each key is a rule name, each value can be:
    - **Simple value**: Uses default 'merge' strategy
    - **Configuration object**:
      - `strategy` _(string)_ - One of: 'merge', 'replace', 'remove', 'append', 'prepend'
      - `value` _(any)_ - The rule value/options (not needed for 'remove' strategy)
      - `severity` _(string|number, optional)_ - 'error', 'warn', 'off' or 0, 1, 2
      - `customHandler` _(Object, optional)_ - Custom handler with `process` function

#### Returns

An array of ESLint override configurations with:

- Customized rules based on your specifications
- Transformed file patterns relative to your directory
- All applicable overrides from root configuration

#### Throws

- Error if `childConfigDir` is not provided
- Error if `rules` is empty or not provided

## Strategies Explained

### `merge` (default)

- **For arrays**: Combines arrays, removing duplicates
- **For objects**: Merges properties
- **For no-restricted-imports**: Intelligently merges paths and patterns with deduplication

### `replace`

- Completely replaces the rule value
- Useful when you want to override the root configuration entirely

### `remove`

- Removes the rule from all applicable overrides
- For `no-restricted-imports`: Can remove specific imports if value is provided

### `append`

- Adds items to the end (similar to merge for most rules)
- For `no-restricted-imports`: Same as merge

### `prepend`

- Adds items to the beginning
- For `no-restricted-imports`: Adds restrictions before existing ones

## Built-in Rule Handlers

Currently, the package has specialized handling for:

- **`no-restricted-imports`**: Intelligent merging with deduplication, supports all strategies

Other rules use the default handler which supports basic operations. More specialized handlers can be added as needed.

## Real-World Example

```javascript
// x-pack/solutions/<solution>/<package|plugin>/.eslintrc.js
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      // Merge additional import restrictions with severity upgrade
      'no-restricted-imports': {
        strategy: 'merge',
        severity: 'error', // Upgrade from warn to error
        value: [
          {
            name: 'react-router-dom',
            message: 'Please use @kbn/shared-ux-router for routing',
          },
          {
            name: 'lodash',
            message: 'Use native ES or @kbn/std instead',
          },
        ],
      },

      // Replace console settings for this directory
      'no-console': {
        strategy: 'replace',
        value: ['error', { allow: ['error'] }], // Only allow console.error
      },

      // Remove a rule that doesn't make sense here
      'no-underscore-dangle': {
        strategy: 'remove',
      },
    },
  }),
};
```

## Troubleshooting

### Common Issues

1. **"No childConfigDir provided"**

   - Solution: Pass `__dirname` as the `childConfigDir` parameter

2. **"No rules provided"**

   - Solution: Ensure `rules` object has at least one rule

3. **Override not applying**

   - Check if the file pattern from root config actually matches your directory
   - Use `--debug` flag with ESLint to see which overrides are active

4. **Patterns not transforming correctly**
   - Ensure your `childConfigDir` path is absolute (use `__dirname`)
   - Check that root `.eslintrc.js` has valid patterns

### Debug Tips

To see what overrides are being generated:

```javascript
const overrides = createRuleOverrides({
  childConfigDir: __dirname,
  rules: {
    'no-restricted-imports': ['lodash'],
  },
});

console.log(JSON.stringify(overrides, null, 2));
```

## Contributing

When modifying this package:

1. Run tests: `yarn test:jest packages/kbn-eslint-rule-overrides`
2. Add specialized handlers for rules that need intelligent merging
3. Ensure pattern transformation works correctly for nested contexts
4. Test with real `.eslintrc.js` files in various directory depths
5. Verify negation patterns behave correctly

## License

See Kibana's main LICENSE file for licensing information.
