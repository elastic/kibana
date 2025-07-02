# @kbn/security-hardening

A package counterpart of `src/setup_node_env/harden` - containing overrides, utilities, and tools to reduce potential vulnerability.

## console

When running in production mode (`process.env.NODE_ENV === 'production'`), global console methods `debug`, `error`, `info`, `log`, `trace`, and `warn` are overridden to implement input sanitization. The export `unsafeConsole` provides access to the unmodified global console methods.

## prototype

The prototypes of most built-in classes are sealed to mitigate many prototype pollution vulnerabilities.