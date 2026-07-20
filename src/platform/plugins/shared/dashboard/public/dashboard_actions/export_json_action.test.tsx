/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { ExportJSONActionApi } from './export_json_action';
import { ExportJSONAction } from './export_json_action';

const mockOpenLazyFlyout = jest.fn();
jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: (...args: unknown[]) => mockOpenLazyFlyout(...args),
}));

jest.mock('../services/kibana_services', () => ({
  coreServices: {
    http: { post: jest.fn() },
  },
}));

describe('Export JSON action', () => {
  let action: ExportJSONAction;
  let context: { embeddable: ExportJSONActionApi };

  beforeEach(() => {
    jest.clearAllMocks();
    action = new ExportJSONAction();
    context = {
      embeddable: {
        supportsJsonExport: true,
        uuid: 'panel-1',
        type: 'testEmbeddable',
        title$: new BehaviorSubject<string | undefined>('My Panel'),
        hideTitle$: new BehaviorSubject<boolean | undefined>(false),
        serializeState: jest.fn().mockReturnValue({ rawState: { key: 'value' } }),
        applySerializedState: jest.fn(),
        anyStateChange$: new BehaviorSubject<void>(undefined),
      },
    };
  });

  it('is compatible when api meets all conditions', async () => {
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible when supportsJsonExport is missing', async () => {
    const { supportsJsonExport: _removed, ...withoutExport } = context.embeddable;
    expect(await action.isCompatible({ embeddable: withoutExport })).toBe(false);
  });

  it('is incompatible when uuid is missing', async () => {
    const { uuid: _removed, ...withoutUuid } = context.embeddable;
    expect(await action.isCompatible({ embeddable: withoutUuid })).toBe(false);
  });

  it('is incompatible when type is missing', async () => {
    const { type: _removed, ...withoutType } = context.embeddable;
    expect(await action.isCompatible({ embeddable: withoutType })).toBe(false);
  });

  it('is incompatible when serializeState is missing', async () => {
    const { serializeState: _removed, ...withoutSerialize } = context.embeddable;
    expect(await action.isCompatible({ embeddable: withoutSerialize })).toBe(false);
  });

  it('calls openLazyFlyout when executed with a compatible embeddable', async () => {
    await action.execute(context);
    expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);
  });

  it('throws IncompatibleActionError when executed with an incompatible embeddable', async () => {
    await expect(action.execute({ embeddable: {} })).rejects.toThrow();
  });

  it('passes getSerializedStateByValue when embeddable supports library transforms and isByReference is false', async () => {
    const getSerializedStateByValueMock = jest
      .fn()
      .mockReturnValue({ rawState: { byValue: true } });
    const embeddableWithLibrary: ExportJSONActionApi = {
      ...context.embeddable,
      canLinkToLibrary: jest.fn().mockResolvedValue(false),
      canUnlinkFromLibrary: jest.fn().mockResolvedValue(false),
      saveToLibrary: jest.fn().mockResolvedValue('id'),
      getSerializedStateByReference: jest.fn().mockReturnValue({}),
      getSerializedStateByValue: getSerializedStateByValueMock,
      hasLibraryItemWithTitle: jest.fn().mockResolvedValue(false),
    };

    await action.execute({ embeddable: embeddableWithLibrary });

    expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);
  });
});
