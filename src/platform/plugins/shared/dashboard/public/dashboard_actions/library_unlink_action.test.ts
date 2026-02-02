/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { UnlinkPanelFromLibraryActionApi } from './library_unlink_action';
import { UnlinkFromLibraryAction } from './library_unlink_action';

describe('AddToLibraryAction', () => {
  const action = new UnlinkFromLibraryAction();
  const replacePanelMock = jest.fn();
  const embeddableApi = {
    defaultTitle$: new BehaviorSubject('Panel one'),
    checkForDuplicateTitle: async () => {},
    canLinkToLibrary: async () => false,
    canUnlinkFromLibrary: async () => true,
    getSerializedStateByReference: () => ({}),
    getSerializedStateByValue: () => ({ key1: 'value1' }),
    parentApi: {
      replacePanel: replacePanelMock,
      viewMode$: new BehaviorSubject('edit'),
    },
    saveToLibrary: async () => 'libraryId1',
    type: 'testEmbeddable',
    uuid: '1',
  } as UnlinkPanelFromLibraryActionApi;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    test('should replace panel with by value panel', async () => {
      await action.execute({ embeddable: embeddableApi });
      expect(replacePanelMock).toHaveBeenCalledWith('1', {
        panelType: 'testEmbeddable',
        serializedState: {
          key1: 'value1',
          // should get default title from by reference embeddable
          title: 'Panel one',
        },
      });
    });
  });
});
