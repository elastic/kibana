/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Throwaway spike plumbing, not part of any option. Wraps a plugin's own bindings and adds:
 * - a probe run at setup, at start, and on every GET /api/spike/<id> request;
 * - log lines so the boot log shows what each plugin saw and when.
 */

import type { Container } from 'inversify';
import { KibanaContainerModule, OnSetup, OnStart } from '@kbn/core-di';
import type { KibanaContainerModuleLoadOptions } from '@kbn/core-di';
import { CoreSetup, PluginInitializer } from '@kbn/core-di-server';

export interface SpikeModuleOptions {
  id: string;
  bindings: (options: KibanaContainerModuleLoadOptions) => void;
  probe: (container: Container) => unknown;
  /** Optional deferred probe started at setup; resolves whenever the option allows. */
  deferredProbe?: (
    options: KibanaContainerModuleLoadOptions,
    container: Container
  ) => Promise<unknown>;
}

export const createSpikeModule = ({ id, bindings, probe, deferredProbe }: SpikeModuleOptions) =>
  new KibanaContainerModule((options) => {
    const observations: Record<string, unknown> = {};
    const safeProbe = (container: Container) => {
      try {
        return probe(container);
      } catch (e) {
        return `THROWS: ${(e as Error).message.split('\n')[0]}`;
      }
    };

    bindings(options);

    options.bind(OnSetup).toResolvedValue(
      (loggerFactory, http) => (container: Container) => {
        const log = loggerFactory.get('spike');
        observations.setup = safeProbe(container);
        log.info(`${id} at setup sees ${JSON.stringify(observations.setup)}`);

        deferredProbe?.(options, container).then((value) => {
          observations.deferredFromSetup = value;
          log.info(`${id} deferred probe (started at setup) resolved ${JSON.stringify(value)}`);
        });

        http.createRouter().get(
          {
            path: `/api/spike/${id}`,
            validate: false,
            security: { authz: { enabled: false, reason: 'throwaway spike route' } },
          },
          async (_context, _request, response) =>
            response.ok({ body: { id, ...observations, request: safeProbe(container) } })
        );
      },
      [PluginInitializer('logger'), CoreSetup('http')]
    );

    options.bind(OnStart).toResolvedValue(
      (loggerFactory) => (container: Container) => {
        observations.start = safeProbe(container);
        loggerFactory
          .get('spike')
          .info(`${id} at start sees ${JSON.stringify(observations.start)}`);
      },
      [PluginInitializer('logger')]
    );
  });
