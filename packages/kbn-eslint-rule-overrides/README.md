# @kbn/eslint-rule-overrides

A utility package for inheriting and customizing ESLint rules from Kibana's root configuration into nested directory contexts.

## Purpose

This package enables teams to:

- Inherit all applicable ESLint rules from the root `.eslintrc.js`
- Change severity levels for any rule
- Replace or remove rules entirely
- Add built-in handlers for complex rule-specific logic (like merging import restrictions)
- Automatically transform file patterns to work correctly in nested contexts
- Maintain consistency with root configuration while allowing controlled customization

## How It Works

The package performs several key transformations:

1. **Clones and processes**: Deep clones the root ESLint configuration and applies your rule customizations
2. **Applies strategies**: Each rule can use different strategies based on whether it has a built-in handler
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

### Basic Usage - Severity Changes

The simplest and safest operation is changing rule severity:

```javascript
// src/plugins/my-plugin/.eslintrc.js
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname, // Required: tells the package where this config lives
    rules: {
      // Change severity only - works for any rule
      'no-console': {
        severity: 'error', // Upgrade from warn to error
      },
      'no-debugger': {
        severity: 'warn', // Downgrade from error to warn
      },
    },
  }),
};
```

### Replace and Remove Strategies

These strategies work for any rule without needing custom handlers:

```javascript
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      // Completely replace a rule configuration
      'no-console': {
        strategy: 'replace',
        value: ['error', { allow: ['warn', 'error'] }],
      },

      // Remove a rule entirely
      'no-debugger': {
        strategy: 'remove',
      },

      // Replace with simpler config
      complexity: {
        strategy: 'replace',
        value: 'off',
      },
    },
  }),
};
```

### Rules With Built-in Handlers

Some rules have built-in handlers that support merge operations:

```javascript
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      // Built-in handler for no-restricted-imports
      'no-restricted-imports': {
        strategy: 'merge', // Works because package has built-in handler
        severity: 'error',
        value: ['lodash', 'moment'],
      },
    },
  }),
};
```

### no-restricted-imports Examples

The package includes a built-in handler for `no-restricted-imports` that intelligently merges restrictions:

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

## Need Merge/Append/Prepend for Your Rule?

If you need merge, append, or prepend strategies for a rule that doesn't have a built-in handler yet, you have two options:

### Option 1: Contribute a Built-in Handler (Recommended)

**This is the preferred approach** as it benefits everyone using the package. Here's how:

1. **Create the handler file**: `src/rule_handlers/[rule-name]/index.js`

```javascript
// src/rule_handlers/import-order/index.js
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Handler for import/order rule
 *
 * This handler merges import/order configurations intelligently by:
 * - Combining group arrays while preserving order preferences
 * - Merging pathGroups arrays with deduplication
 * - Preserving alphabetize settings with override capability
 */
const importOrderHandler = {
  ruleName: 'import/order',

  /**
   * Process import/order rule overrides
   * @param {Object} config - Cloned ESLint config to modify
   * @param {Object} ruleConfig - Rule configuration from user
   * @param {Object} context - Context with rootDir, childConfigDir, ruleName
   */
  process(config, ruleConfig, context) {
    const { strategy, value, severity } = ruleConfig;

    if (!config.overrides || config.overrides.length === 0) {
      return;
    }

    const normalizedSeverity = severity !== undefined ? normalizeSeverity(severity) : null;

    switch (strategy) {
      case 'merge':
        mergeImportOrder(config, value, normalizedSeverity);
        break;

      case 'replace':
        replaceImportOrder(config, value, normalizedSeverity);
        break;

      case 'remove':
        removeImportOrder(config);
        break;

      default:
        throw new Error(`Unknown strategy '${strategy}' for import/order`);
    }
  },
};

function mergeImportOrder(config, newOptions, severity) {
  // Find all overrides with import/order rule
  const overridesWithRule = config.overrides.filter(
    (override) => override.rules && 'import/order' in override.rules
  );

  for (const override of overridesWithRule) {
    const existingRule = override.rules['import/order'];

    if (!Array.isArray(existingRule) || existingRule.length < 2) {
      continue;
    }

    const [currentSeverity, currentOptions] = existingRule;
    const finalSeverity = severity !== null ? severity : currentSeverity;

    // Merge the options objects
    const mergedOptions = {
      ...currentOptions,
      ...newOptions,
    };

    // Special handling for arrays that should be combined
    if (currentOptions.pathGroups && newOptions.pathGroups) {
      // Combine pathGroups, removing duplicates by pattern
      const existingPatterns = new Set(currentOptions.pathGroups.map((g) => g.pattern));
      const newGroups = newOptions.pathGroups.filter((g) => !existingPatterns.has(g.pattern));
      mergedOptions.pathGroups = [...currentOptions.pathGroups, ...newGroups];
    }

    override.rules['import/order'] = [finalSeverity, mergedOptions];
  }
}

function replaceImportOrder(config, value, severity) {
  // Implementation for replace...
}

function removeImportOrder(config) {
  // Implementation for remove...
}

function normalizeSeverity(severity) {
  const severityMap = {
    off: 0,
    warn: 1,
    error: 2,
    0: 0,
    1: 1,
    2: 2,
  };
  return severityMap[severity] !== undefined ? severityMap[severity] : null;
}

module.exports = importOrderHandler;
```

2. **Register the handler**: Add it to `src/rule_handlers/index.js`

```javascript
// src/rule_handlers/index.js
// ... existing imports ...

// Register your new handler
registerRuleHandler('import/order', require('./import-order'));
```

3. **Add tests**: Create `src/rule_handlers/import-order/index.test.js`

4. **Submit a PR**: Your handler will now be available for everyone!

### Option 2: Use a Custom Handler (Quick Solution)

If you need a quick solution or are still experimenting with the merge logic, you can use a custom handler inline. However, **please consider contributing it as a built-in handler once it's working well**.

```javascript
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      'import/order': {
        strategy: 'merge',
        value: {
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@myteam/**',
              group: 'internal',
              position: 'before',
            },
          ],
        },
        customHandler: {
          process(config, ruleConfig, context) {
            const { strategy, value, severity } = ruleConfig;

            // Your merge logic here
            // config: the cloned ESLint config - modify it directly
            // context.rootDir: root directory path
            // context.childConfigDir: your config directory
            // context.ruleName: 'import/order'

            if (!config.overrides) return;

            for (const override of config.overrides) {
              if (!override.rules || !override.rules['import/order']) continue;

              const existingRule = override.rules['import/order'];
              if (!Array.isArray(existingRule)) continue;

              const [currentSeverity, currentOptions] = existingRule;

              if (strategy === 'merge') {
                // Merge logic specific to import/order
                const mergedOptions = {
                  ...currentOptions,
                  ...value,
                };

                // Handle arrays specially
                if (currentOptions.pathGroups && value.pathGroups) {
                  const existingPatterns = new Set(currentOptions.pathGroups.map((g) => g.pattern));
                  const newGroups = value.pathGroups.filter(
                    (g) => !existingPatterns.has(g.pattern)
                  );
                  mergedOptions.pathGroups = [...currentOptions.pathGroups, ...newGroups];
                }

                override.rules['import/order'] = [severity || currentSeverity, mergedOptions];
              }
            }
          },
        },
      },
    },
  }),
};
```

**Important:** While custom handlers work, they have drawbacks:

- Code duplication across teams
- No shared testing
- Inconsistent implementations
- Maintenance burden

**We strongly encourage contributing your handler back to the package** so everyone benefits from consistent, well-tested merge logic.

## API Reference

### `createRuleOverrides(options)`

Creates ESLint override configurations that inherit and customize root rules.

#### Parameters

- **`options`** _(Object)_ - Configuration object with the following properties:
  - **`childConfigDir`** _(string, required)_ - Directory path where your `.eslintrc.js` is located. Pass `__dirname`.
  - **`rules`** _(Object, required)_ - Rules to customize. Each key is a rule name, each value can be:
    - **Severity only**: Object with just `severity` property
    - **Configuration object**:
      - `strategy` _(string)_ - One of: 'replace', 'remove', 'merge', 'append', 'prepend'
      - `value` _(any)_ - The rule value/options (not needed for 'remove' strategy)
      - `severity` _(string|number, optional)_ - 'error', 'warn', 'off' or 0, 1, 2
      - `customHandler` _(Object, optional)_ - Custom handler with `process` function (consider contributing as built-in instead)

#### Returns

An array of ESLint override configurations with:

- Customized rules based on your specifications
- Transformed file patterns relative to your directory
- All applicable overrides from root configuration

#### Throws

- Error if `childConfigDir` is not provided
- Error if `rules` is empty or not provided
- Error if using 'merge', 'append', or 'prepend' without a built-in or custom handler
- Error if invalid severity value is provided

## Strategies Explained

### Default Strategies (No Handler Required)

These work without custom handlers:

#### `severity` (no strategy needed)

- Changes only the severity level of the rule
- Preserves all rule options/configuration
- Safe for any rule

#### `replace`

- Completely replaces the rule value
- Use when you want to override the root configuration entirely
- You take full responsibility for the rule configuration

#### `remove`

- Removes the rule from all applicable overrides
- Use to disable a rule completely in your context

### Strategies Requiring Handlers

These require either built-in or custom handlers:

#### `merge`

- Combines new configuration with existing
- Requires rule-specific logic to define how merging works
- Built-in support for `no-restricted-imports`

#### `append`

- Adds items to the end
- Requires rule-specific logic
- Built-in support for `no-restricted-imports`

#### `prepend`

- Adds items to the beginning
- Requires rule-specific logic
- Built-in support for `no-restricted-imports`

## Built-in Rule Handlers

Currently, the package has specialized handling for:

- **`no-restricted-imports`**: Intelligent merging with deduplication, supports all strategies

**Want to add more?** Please contribute! See "Contributing Built-in Handlers" below.

## Real-World Example

```javascript
// x-pack/solutions/<solution>/<package|plugin>/.eslintrc.js
const { createRuleOverrides } = require('@kbn/eslint-rule-overrides');

module.exports = {
  overrides: createRuleOverrides({
    childConfigDir: __dirname,
    rules: {
      // Simple severity change - works for any rule
      complexity: {
        severity: 'error', // Upgrade from warn
      },

      // Merge import restrictions (built-in handler)
      'no-restricted-imports': {
        strategy: 'merge',
        severity: 'error',
        value: [
          {
            name: 'react-router-dom',
            message: 'Please use @kbn/shared-ux-router for routing',
          },
        ],
      },

      // Replace console settings entirely
      'no-console': {
        strategy: 'replace',
        value: ['error', { allow: ['error'] }], // Only allow console.error
      },

      // Remove a rule that doesn't apply here
      'no-underscore-dangle': {
        strategy: 'remove',
      },
    },
  }),
};
```

## Why Handlers Are Required for Merge Operations

ESLint rules have vastly different configuration formats:

- Some accept strings: `'error'`
- Some accept arrays: `['error', 'option1', 'option2']`
- Some accept objects: `['error', { key: 'value' }]`
- Some accept multiple parameters: `['error', 'string', { key: 'value' }]`

"Merging" means different things for different rules:

- For `no-restricted-imports`: Combine arrays of restrictions
- For `import/order`: Merge group configurations
- For `no-console`: What does merge even mean? Combine `allow` arrays?

Rather than guess and potentially corrupt your ESLint config, this package requires you to explicitly define merge behavior via handlers or use the safer 'replace' strategy.

## Contributing Built-in Handlers

Adding a built-in handler benefits everyone. Here's how:

### 1. Study the Rule

Understand the rule's configuration format from [ESLint docs](https://eslint.org/docs/rules/) or the plugin's documentation.

### 2. Create Handler Structure

```
src/rule_handlers/
  your-rule-name/
    index.js        # Handler implementation
    index.test.js   # Tests
    utils/          # Optional utilities
      merge-logic.js
      merge-logic.test.js
```

### 3. Implement the Handler

Follow the pattern from existing handlers. Key points:

- Handle all strategies (merge, append, prepend, replace, remove)
- Validate inputs
- Handle edge cases
- Preserve unrelated configuration

### 4. Test Thoroughly

- Test all strategies
- Test with various rule configurations from root config
- Test edge cases
- Test severity changes

### 5. Document

Add your rule to the "Built-in Rule Handlers" section in this README.

### 6. Submit PR

Tag `@elastic/kibana-operations` for review.

## Troubleshooting

### Common Issues

1. **"Strategy 'merge' requires a custom handler"**

   - **Best solution**: Contribute a built-in handler for the rule
   - **Quick solution**: Use 'replace' strategy instead
   - **Temporary solution**: Add a custom handler inline

   Example:

   ```javascript
   // Instead of:
   'no-console': ['error', { allow: ['error'] }]

   // Use replace:
   'no-console': {
     strategy: 'replace',
     value: ['error', { allow: ['error'] }]
   }

   // Or just change severity:
   'no-console': {
     severity: 'error'
   }
   ```

2. **"Invalid severity 'invalid' for rule"**

   - Solution: Use valid severity values: 'off', 'warn', 'error', or 0, 1, 2

3. **"No childConfigDir provided"**

   - Solution: Pass `__dirname` as the `childConfigDir` parameter

4. **"No rules provided"**

   - Solution: Ensure `rules` object has at least one rule

5. **Override not applying**

   - Check if the file pattern from root config actually matches your directory
   - Use `--debug` flag with ESLint to see which overrides are active

### Debug Tips

To see what overrides are being generated:

```javascript
const overrides = createRuleOverrides({
  childConfigDir: __dirname,
  rules: {
    'no-console': { severity: 'error' },
  },
});

console.log(JSON.stringify(overrides, null, 2));
```

## Development

When working on this package:

1. Run tests: `yarn test:jest packages/kbn-eslint-rule-overrides`
2. Test with real `.eslintrc.js` files in various directory depths
3. Verify against the root `.eslintrc.js` configuration
4. Ensure error messages are clear and actionable
5. Consider contributing handlers for commonly used rules

## License

See Kibana's main LICENSE file for licensing information.
