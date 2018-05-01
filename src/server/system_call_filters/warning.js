export async function warnIfDanger(kbnServer, server, config) {
  if (config.get('server.systemCallFilters.enabled') === false) {
    server.log(['system-call-filters', 'warning'], 'Running with disabled system call filters is dangerous.');
  }
}
