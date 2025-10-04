# @kbn/dependency-tree

A CLI tool for visualizing TypeScript dependency trees using `tsconfig.json` files with `kbn_references`.

## Usage

### Command Line Interface

```bash
node scripts/kbn_dependency_tree <tsconfig.json> [options]
```

#### Basic Examples

```bash
# Analyze ML plugin dependencies
node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json

# Self-referential example - analyze this package's own dependencies
node scripts/kbn_dependency_tree packages/kbn-dependency-tree/tsconfig.json

# Limit depth to avoid deep traversal
node scripts/kbn_dependency_tree packages/some-package/tsconfig.json --depth 2

# Filter to only show ML-related dependencies
node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json --filter "@kbn/ml-"

# Show package paths in output
node scripts/kbn_dependency_tree packages/some-package/tsconfig.json --paths

# Output as JSON for further processing
node scripts/kbn_dependency_tree packages/some-package/tsconfig.json --json
```

#### Command Line Options

| Option               | Description                             | Default |
| -------------------- | --------------------------------------- | ------- |
| `--depth <n>`        | Maximum depth to traverse               | `3`     |
| `--paths`            | Show package paths in parentheses       | `false` |
| `--filter <pattern>` | Show only dependencies matching pattern | none    |
| `--json`             | Output as JSON instead of tree format   | `false` |

#### Example Output

**Tree Format:**

```
└─ @kbn/dependency-tree
   ├─ @kbn/dev-cli-runner
   │  ├─ @kbn/dev-cli-errors
   │  ├─ @kbn/ci-stats-reporter
   │  │  ├─ @kbn/tooling-log
   │  │  └─ @kbn/ci-stats-core
   │  └─ @kbn/tooling-log
   ├─ @kbn/dev-cli-errors
   └─ @kbn/repo-packages
      └─ @kbn/projects-solutions-groups

Legend:
  [EXTERNAL]     - Package not found in root package.json dependencies
  [CIRCULAR]     - Circular dependency detected
  [NO-TSCONFIG]  - Package found but no tsconfig.json
```

**JSON Format:**

```json
{
  "id": "@kbn/dependency-tree",
  "tsconfigPath": "packages/kbn-dependency-tree/tsconfig.json",
  "packagePath": "packages/kbn-dependency-tree",
  "dependencies": [
    {
      "id": "@kbn/dev-cli-runner",
      "tsconfigPath": "packages/kbn-dev-cli-runner/tsconfig.json",
      "packagePath": "packages/kbn-dev-cli-runner",
      "dependencies": [...]
    }
  ]
}
```

## How It Works

1. **Reads tsconfig.json** files and extracts `kbn_references` arrays
2. **Maps package names** to file paths using the root `package.json` dependencies
3. **Builds dependency tree** by recursively following references
4. **Detects issues** like circular dependencies, external packages, and missing tsconfigs
5. **Formats output** as visual tree or structured JSON

## Dependency Issue Detection

The tool automatically detects and labels various dependency issues:

- **`[CIRCULAR]`** - Circular dependency detected in the dependency chain
- **`[EXTERNAL]`** - Package referenced but not found in root package.json dependencies
- **`[NO-TSCONFIG]`** - Package found but has no tsconfig.json file

## Development

### Running Tests

```bash
# Run all tests for this package
yarn test:jest packages/kbn-dependency-tree

# Run with coverage
yarn test:jest packages/kbn-dependency-tree --coverage
```
