/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { BfetchServerSetup, BfetchServerStart } from '@kbn/bfetch-plugin/server';

export interface BfetchExplorerSetupPlugins {
  bfetch: BfetchServerSetup;
}

export interface BfetchExplorerStartPlugins {
  bfetch: BfetchServerStart;
}

export class BfetchExplorerPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: BfetchExplorerSetupPlugins) {
    plugins.bfetch.addStreamingResponseRoute<string, string>('/bfetch_explorer/count', () => ({
      getResponseStream: ({ data }: any) => {
        const subject = new Subject<string>();
        const countTo = Number(data);
        for (let cnt = 1; cnt <= countTo; cnt++) {
          setTimeout(() => {
            subject.next(String(cnt));
          }, cnt * 1000);
        }
        setTimeout(() => {
          subject.complete();
        }, countTo * 1000);
        return subject;
      },
    }));

    plugins.bfetch.addBatchProcessingRoute<{ num: number }, { num: number }>(
      '/bfetch_explorer/double',
      () => ({
        onBatchItem: async ({ num }) => {
          // Validate inputs.
          if (num < 0) throw new Error('Invalid number');
          // Wait number of specified milliseconds.
          await new Promise((r) => setTimeout(r, num));
          // Double the number and send it back.
          return { num: 2 * num };
        },
      })
    );
  }

  public start(core: CoreStart, plugins: BfetchExplorerStartPlugins) {}

  public stop() {}
}
