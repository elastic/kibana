import { Observable } from 'rxjs';
import { findPluginSpecs } from '../../plugin_discovery';

import { Plugin } from './lib';

export async function scanMixin(kbnServer, server, config) {
  const {
    pack$,
    invalidDirectoryError$,
    invalidPackError$,
    deprecation$,
    invalidVersionSpec$,
    spec$,
  } = findPluginSpecs(kbnServer.settings, config);

  const logging$ = Observable.merge(
    pack$.do(definition => {
      server.log(['plugin', 'debug'], {
        tmpl: 'Found plugin at <%= path %>',
        path: definition.getPath()
      });
    }),

    invalidDirectoryError$.do(error => {
      server.log(['plugin', 'warning'], {
        tmpl: '<%= err.code %>: Unable to scan directory for plugins "<%= dir %>"',
        err: error,
        dir: error.path
      });
    }),

    invalidPackError$.do(error => {
      server.log(['plugin', 'warning'], {
        tmpl: 'Skipping non-plugin directory at <%= path %>',
        path: error.path
      });
    }),

    invalidVersionSpec$
      .map(spec => {
        const name = spec.getId();
        const pluginVersion = spec.getExpectedKibanaVersion();
        const kibanaVersion = config.get('pkg.version');
        return `Plugin "${name}" was disabled because it expected Kibana version "${pluginVersion}", and found "${kibanaVersion}".`;
      })
      .distinct()
      .do(message => {
        server.log(['plugin', 'warning'], message);
      }),

    deprecation$.do(({ spec, message }) => {
      server.log(['warning', spec.getConfigPrefix(), 'config', 'deprecation'], message);
    })
  );

  kbnServer.pluginSpecs = await spec$
    .merge(logging$.ignoreElements())
    .toArray()
    .toPromise();

  kbnServer.plugins = kbnServer.pluginSpecs.map(spec => (
    new Plugin(kbnServer, spec)
  ));
}
