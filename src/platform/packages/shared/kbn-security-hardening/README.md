# @kbn/security-hardening

A package counterpart of `src/setup_node_env/harden` - containing overrides, utilities, and tools to reduce potential vulnerability.

## console

When running in production mode (`process.env.NODE_ENV === 'production'`), global console methods `debug`, `error`, `info`, `log`, `trace`, and `warn` are overridden to implement input sanitization. The export `unsafeConsole` provides access to the unmodified global console methods.

## prototype

The prototypes of most built-in classes are sealed to mitigate many prototype pollution vulnerabilities.

## Code generation from strings

The packaged Kibana server (`bin/kibana` / `bin/kibana.bat`) runs with the V8 flag `--disallow-code-generation-from-strings` **by default**, which causes `eval()` and `new Function(string)` to throw. To opt out, set the environment variable `KBN_DISALLOW_CODE_GEN_FROM_STRINGS=false` before launching Kibana.

## Testing

Scout API tests live in `test/scout_hardening/api/` and verify that server-side hardening measures are active at runtime (e.g. `--disallow-code-generation-from-strings` blocking `eval()` and `new Function()`). These tests require the `hardening` server config set which loads the test plugin from `src/platform/test/plugin_functional/plugins/hardening/`.