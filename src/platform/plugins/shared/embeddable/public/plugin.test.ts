/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { testPlugin } from './tests/test_plugin';

describe('embeddable enhancements', () => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const { setup, doStart } = testPlugin(coreSetup, coreStart);
  const start = doStart();
  const embeddableEnhancement = {
    id: 'test',
    extract: jest.fn().mockImplementation((state) => ({ state, references: [] })),
    inject: jest.fn().mockImplementation((state) => state),
    telemetry: jest.fn().mockResolvedValue({}),
    migrations: { '7.11.0': jest.fn().mockImplementation((state) => state) },
  } as any;
  const embeddableState = {
    enhancements: {
      test: {
        my: 'state',
      },
    },
  } as any;

  setup.registerEnhancement(embeddableEnhancement);

  test('cannot register embeddable enhancement with the same ID', async () => {
    expect(() => setup.registerEnhancement(embeddableEnhancement)).toThrowError(
      'enhancement with id test already exists in the registry'
    );
  });

  test('enhancement extract function gets called when calling embeddable extract', () => {
    start.extract(embeddableState);
    expect(embeddableEnhancement.extract).toBeCalledWith(embeddableState.enhancements.test);
  });

  test('enhancement inject function gets called when calling embeddable inject', () => {
    start.inject(embeddableState, []);
    expect(embeddableEnhancement.extract).toBeCalledWith(embeddableState.enhancements.test);
  });

  test('enhancement telemetry function gets called when calling embeddable telemetry', () => {
    start.telemetry(embeddableState, {});
    expect(embeddableEnhancement.telemetry).toBeCalledWith(embeddableState.enhancements.test, {});
  });

  test('enhancement migrate function gets called when calling embeddable migrate', () => {
    start.getAllMigrations!()['7.11.0']!(embeddableState);
    expect(embeddableEnhancement.migrations['7.11.0']).toBeCalledWith(
      embeddableState.enhancements.test
    );
  });

  test('doesnt fail if there is no migration function registered for specific version', () => {
    expect(() => {
      start.getAllMigrations!()['7.11.0']!(embeddableState);
    }).not.toThrow();

    expect(start.getAllMigrations!()['7.11.0']!(embeddableState)).toEqual(embeddableState);
  });
});
