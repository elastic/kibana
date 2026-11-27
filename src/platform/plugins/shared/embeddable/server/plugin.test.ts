/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { z } from '@kbn/zod';
import { coreMock } from '@kbn/core/server/mocks';
import { EmbeddableServerPlugin } from './plugin';

const startPlugin = (isDev: boolean) => {
  const initializerContext = coreMock.createPluginInitializerContext();
  initializerContext.env.mode.dev = isDev;
  const flag$ = new BehaviorSubject<boolean>(isDev);

  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue$.mockReturnValue(flag$);

  const plugin = new EmbeddableServerPlugin(initializerContext);
  const setup = plugin.setup(coreMock.createSetup());
  const start = plugin.start(coreStart);

  return { coreStart, flag$, setup, start };
};

describe('EmbeddableServerPlugin lens.apiFormat cache reset', () => {
  it.each([true, false])('evaluates the flag with the dev mode (%s) as its fallback', (isDev) => {
    const { coreStart } = startPlugin(isDev);

    expect(coreStart.featureFlags.getBooleanValue$).toHaveBeenCalledWith('lens.apiFormat', isDev);
  });

  it('refreshes cached schemas when an explicit override changes the dev default', () => {
    const { flag$, setup, start } = startPlugin(true);
    const schema = z.object({ field: z.string() });
    let flagValue = flag$.value;
    // the schema depends on the flag, like Lens' `getSchema`
    setup.registerEmbeddableServerDefinition('flagged', {
      title: 'Flagged',
      getSchema: () => (flagValue ? schema : undefined),
    });

    expect(Object.keys(start.getAllEmbeddableSchemas())).toEqual(['flagged']);

    // an explicit `false` override replaces the dev default of `true`
    flagValue = false;
    flag$.next(false);

    expect(start.getAllEmbeddableSchemas()).toEqual({});
  });
});
