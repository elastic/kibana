/**
 * Return the configuration files that needs to be loaded.
 *
 * This mimics the behavior of the `src/cli/serve/serve.js` cli script by reading
 * `-c` and `--config` options from process.argv, and fallbacks to `@kbn/utils`'s `getConfigPath()`
 */
export declare const getConfigurationFilePaths: (argv: string[]) => string[];
