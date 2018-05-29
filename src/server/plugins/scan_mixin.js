/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
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

    otherError$.do(error => {
      // rethrow unhandled errors, which will fail the server
      throw error;
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

  const enabledSpecs$ = spec$
    .toArray()
    .do(specs => {
      kbnServer.pluginSpecs = specs;
    });

  const disabledSpecs$ = disabledSpec$
    .toArray()
    .do(specs => {
      kbnServer.disabledPluginSpecs = specs;
    });

  // await completion of enabledSpecs$, disabledSpecs$, and logging$
  await Observable.merge(logging$, enabledSpecs$, disabledSpecs$).toPromise();

  kbnServer.plugins = kbnServer.pluginSpecs.map(spec => (
    new Plugin(kbnServer, spec)
  ));
}
