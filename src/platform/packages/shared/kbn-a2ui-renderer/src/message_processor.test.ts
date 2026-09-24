/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataModel } from './data_model';
import { MessageProcessor } from './message_processor';
import { UnknownMessageError } from './errors';
import type { A2uiMessage } from './types';

const createSurface = (surfaceId: string, dataModel?: Record<string, unknown>): A2uiMessage =>
  ({
    version: 'v1.0',
    createSurface: {
      surfaceId,
      catalogId: 'test/catalog',
      components: [{ id: 'root', component: 'Text', text: surfaceId }],
      ...(dataModel ? { dataModel } : {}),
    },
  } as A2uiMessage);

describe('MessageProcessor', () => {
  it('gives each surface its own data model by default', () => {
    const processor = new MessageProcessor();
    processor.applyAll([createSurface('a', { value: 1 }), createSurface('b', { value: 2 })]);

    expect(processor.getSurface('a')!.dataModel.get('/value')).toBe(1);
    expect(processor.getSurface('b')!.dataModel.get('/value')).toBe(2);
    expect(processor.getSurface('a')!.dataModel).not.toBe(processor.getSurface('b')!.dataModel);
  });

  it('hands every surface the same model when one is injected', () => {
    const shared = new DataModel({});
    const processor = new MessageProcessor({ sharedDataModel: shared });
    processor.applyAll([createSurface('a'), createSurface('b')]);

    expect(processor.getSurface('a')!.dataModel).toBe(shared);
    expect(processor.getSurface('b')!.dataModel).toBe(shared);
  });

  it('lets one surface read what another surface wrote', () => {
    // This is the whole point: a filter panel has to be able to drive a query
    // that belongs to a different panel.
    const processor = new MessageProcessor({ sharedDataModel: new DataModel({}) });
    processor.applyAll([createSurface('filters'), createSurface('chart')]);

    processor.getSurface('filters')!.dataModel.set('/filters/cluster', 'k8s-eu-prod');

    expect(processor.getSurface('chart')!.dataModel.get('/filters/cluster')).toBe('k8s-eu-prod');
  });

  it("merges each surface's seed data rather than clobbering the previous one", () => {
    const shared = new DataModel({});
    const processor = new MessageProcessor({ sharedDataModel: shared });
    processor.applyAll([
      createSurface('a', { totals: { requests: 10 } }),
      createSurface('b', { series: [1, 2, 3] }),
    ]);

    expect(shared.get('/totals/requests')).toBe(10);
    expect(shared.get('/series')).toEqual([1, 2, 3]);
  });

  it('keeps a seeded null, which a plain set would have deleted', () => {
    // Overlays bind `isOpen` to a path seeded as null; the key has to exist for
    // `isEmpty` to resolve against it.
    const shared = new DataModel({});
    new MessageProcessor({ sharedDataModel: shared }).applyAll([
      createSurface('a', { selected: null }),
    ]);

    expect(shared.getSnapshot()).toEqual({ selected: null });
    expect(Object.keys(shared.getSnapshot() as object)).toContain('selected');
  });

  it('notifies subscribers of the shared model when a surface seeds it', () => {
    const shared = new DataModel({});
    const listener = jest.fn();
    shared.subscribe(listener);

    new MessageProcessor({ sharedDataModel: shared }).applyAll([createSurface('a', { x: 1 })]);

    expect(listener).toHaveBeenCalled();
  });

  it('applies updateComponents to an existing surface', () => {
    const processor = new MessageProcessor();
    processor.applyAll([createSurface('a')]);
    processor.apply({
      version: 'v1.0',
      updateComponents: {
        surfaceId: 'a',
        components: [{ id: 'root', component: 'Text', text: 'changed' }],
      },
    } as A2uiMessage);

    expect(processor.getSurface('a')!.components.get('root')).toMatchObject({ text: 'changed' });
  });

  it('rejects a message it does not recognise', () => {
    expect(() => new MessageProcessor().apply({ version: 'v1.0' } as A2uiMessage)).toThrow(
      UnknownMessageError
    );
  });
});
