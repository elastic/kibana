export function warnIfUsingPluginDirOption(options, defaultValue, logger) {
  if (options && options.pluginDir !== defaultValue) {
    logger.log(
      'Warning: Using the -d, --plugin-dir option is deprecated, and is ' +
      'known to not work for all plugins, including X-Pack.'
    );
  }
}
