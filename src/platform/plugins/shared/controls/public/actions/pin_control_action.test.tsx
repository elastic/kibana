/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, take } from 'rxjs';

import type { ViewMode } from '@kbn/presentation-publishing';
import { PinControlAction } from './pin_control_action';

const pinControlAction = new PinControlAction();
const controlApi = {
  type: 'test',
  uuid: '1',
  isPinnable: true,
  parentApi: {
    pinPanel: jest.fn(),
    unpinPanel: jest.fn(),
    panelIsPinned: jest.fn(),
    addPinnedPanel: jest.fn(),
    viewMode$: new BehaviorSubject<ViewMode>('edit'),
  },
};

describe('PinControlAction', () => {
  test('should throw an error when called with an embeddable not in a parent', async () => {
    const noParentApi = { ...controlApi, parentApi: undefined };

    await expect(async () => {
      await pinControlAction.execute({ embeddable: noParentApi });
    }).rejects.toThrow(Error);
  });

  test('should call become compatible when view mode changes', (done) => {
    const subject = pinControlAction.getCompatibilityChangesSubject({
      embeddable: {
        ...controlApi,
        parentApi: {
          ...controlApi.parentApi,
          viewMode$: new BehaviorSubject<ViewMode>('view'),
        },
      },
    });
    subject?.pipe(take(1)).subscribe(() => {
      done();
    });
    controlApi.parentApi.viewMode$.next('edit');
  });

  test('calls appropriate function depennding on if panel is pinned or not', async () => {
    expect(controlApi.parentApi.pinPanel).toBeCalledTimes(0);
    expect(controlApi.parentApi.unpinPanel).toBeCalledTimes(0);

    controlApi.parentApi.panelIsPinned.mockReturnValueOnce(false);
    await pinControlAction.execute({ embeddable: controlApi });
    expect(controlApi.parentApi.pinPanel).toBeCalledTimes(1);
    controlApi.parentApi.panelIsPinned.mockReturnValueOnce(true);
    await pinControlAction.execute({ embeddable: controlApi });
    expect(controlApi.parentApi.unpinPanel).toBeCalledTimes(1);

    controlApi.parentApi.pinPanel.mockReset();
    controlApi.parentApi.unpinPanel.mockReset();
  });
});
