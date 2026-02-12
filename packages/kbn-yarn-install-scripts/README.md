# @kbn/yarn-install-scripts

Automatic script execution is disabled in `.yarnrc`. This package manages node_module lifecycle scripts for install and postinstall.

## Configuration

The `config.json` file contains an array of packages with install scripts and their configured status:

```json
{
  "packages": [
    {
      "path": "package-name",
      "lifecycle": "postinstall",
      "required": true,
      "reason": "reason for action"
    }
  ]
}
```

- `path`: The package path in node_modules (e.g., `@elastic/eui`)
- `lifecycle`: Either `install` or `postinstall`
- `required`: `true` to run the script during bootstrap, `false` to skip it
- `reason`: Explanation of why the script is required or not

## CLI Usage

```bash
node scripts/yarn_install_scripts <command> [options]
```

### Commands

#### `run`

Run allowed install scripts defined in `config.json`:

```bash
node scripts/yarn_install_scripts run
node scripts/yarn_install_scripts run --verbose  # Show install logs
```

#### `scan`

Discovers packages with install scripts and shows whether they are run or skipped:

```bash
node scripts/yarn_install_scripts scan
```