import * as Rx from 'rxjs';
import { map, distinct, toArray, tap } from 'rxjs/operators';
import { findPluginSpecs } from '../../plugin_discovery';

import { Plugin } from './lib';

export async function scanMixin(kbnServer, server, config) {
  const {
    pack$,
    invalidDirectoryError$,
    invalidPackError$,
    otherError$,
    deprecation$,
    invalidVersionSpec$,
    spec$,
    disabledSpec$,
  } = findPluginSpecs(kbnServer.settings, config);

  const logging$ = Rx.merge(
    pack$.pipe(
      tap(definition => {
        server.log(['plugin', 'debug'], {
          tmpl: 'Found plugin at <%= path %>',
          path: definition.getPath()
        });
      })
    ),

    invalidDirectoryError$.pipe(
      tap(error => {
        server.log(['plugin', 'warning'], {
          tmpl: '<%= err.code %>: Unable to scan directory for plugins "<%= dir %>"',
          err: error,
          dir: error.path
        });
      })
    ),

    invalidPackError$.pipe(
      tap(error => {
        server.log(['plugin', 'warning'], {
          tmpl: 'Skipping non-plugin directory at <%= path %>',
          path: error.path
        });
      })
    ),

    otherError$.pipe(
      tap(error => {
        // rethrow unhandled errors, which will fail the server
        throw error;
      })
    ),

    invalidVersionSpec$.pipe(
      map(spec => {
        const name = spec.getId();
        const pluginVersion = spec.getExpectedKibanaVersion();
        const kibanaVersion = config.get('pkg.version');
        return `Plugin "${name}" was disabled because it expected Kibana version "${pluginVersion}", and found "${kibanaVersion}".`;
      }),
      distinct(),
      tap(message => {
        server.log(['plugin', 'warning'], message);
      })
    ),

    deprecation$.pipe(
      tap(({ spec, message }) => {
        server.log(['warning', spec.getConfigPrefix(), 'config', 'deprecation'], message);
      })
    )
  );

  const enabledSpecs$ = spec$.pipe(
    toArray(),
    tap(specs => {
      kbnServer.pluginSpecs = specs;
    })
  );

  const disabledSpecs$ = disabledSpec$.pipe(
    toArray(),
    tap(specs => {
      kbnServer.disabledPluginSpecs = specs;
    })
  );

  // await completion of enabledSpecs$, disabledSpecs$, and logging$
  await Rx.merge(logging$, enabledSpecs$, disabledSpecs$).toPromise();

  kbnServer.plugins = kbnServer.pluginSpecs.map(spec => (
    new Plugin(kbnServer, spec)
  ));
}
