export function parse(command) {

  const settings = {
    quiet: command.quiet || false,
    silent: command.silent || false,
    pluginDir: command.pluginDir || ''
  };

  return settings;
}
