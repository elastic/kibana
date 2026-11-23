/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import { OnReady, SoftDependencies } from '@kbn/core-di';
import { LookupBGreeter } from '@kbn/di-soft-dependencies-example-tokens';
import { LOOKUP_B_DISABLED, PLUGIN_ID } from '../common';

/** The greeting, `LOOKUP_B_DISABLED`, or `'throws'`, per point in the plugin lifecycle. */
export interface ClassicConsumerStatus {
  id: string;
  setup: string;
  start: string;
  onReady: string;
  initialize: string;
  request: string;
}

export class ClassicConsumerPlugin implements Plugin {
  private softDependencies?: SoftDependencies;
  private readonly status: Omit<ClassicConsumerStatus, 'request'> = {
    id: PLUGIN_ID,
    setup: 'not run',
    start: 'not run',
    onReady: 'not run',
    initialize: 'not run',
  };

  public setup(core: CoreSetup): void {
    const container = core.injection.getContainer();
    this.softDependencies = container.get(SoftDependencies);
    this.status.setup = this.greetFromLookupB();
    container.bind(OnReady).toConstantValue(() => {
      this.status.onReady = this.greetFromLookupB();
    });

    core.http.createRouter().get(
      {
        path: `/api/di_soft_deps/${PLUGIN_ID}`,
        validate: false,
        options: { access: 'internal' },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization as it is a developer example endpoint.',
          },
        },
      },
      async (_context, _request, response) => {
        const body: ClassicConsumerStatus = { ...this.status, request: this.greetFromLookupB() };
        return response.ok({ body });
      }
    );
  }

  public start(): void {
    this.status.start = this.greetFromLookupB();
  }

  public async initialize(): Promise<void> {
    this.status.initialize = this.greetFromLookupB();
  }

  // SoftDependencies.get throws until every plugin has started, so setup and start record 'throws'.
  private greetFromLookupB(): string {
    try {
      return this.softDependencies?.get(LookupBGreeter)?.greet() ?? LOOKUP_B_DISABLED;
    } catch {
      return 'throws';
    }
  }
}
