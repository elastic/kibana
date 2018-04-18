import {
  createListRoute,
  createInstallRoute,
  createUninstallRoute,
} from './routes';

export function sampleDataMixin(kbnServer, server) {
  server.route(createListRoute());
  server.route(createInstallRoute());
  server.route(createUninstallRoute());
}
