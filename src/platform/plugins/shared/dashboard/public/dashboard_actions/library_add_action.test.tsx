/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { AddPanelToLibraryActionApi } from './library_add_action';
import { AddToLibraryAction } from './library_add_action';
import { BehaviorSubject } from 'rxjs';

jest.mock('@kbn/saved-objects-plugin/public', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { render } = require('@testing-library/react');
  const MockSavedObjectSaveModal = ({
    onSave,
  }: {
    onSave: (props: OnSaveProps) => Promise<unknown> | unknown;
  }) => {
    // invoke onSave synchronously to simulate the user confirming the save
    onSave({
      newTitle: 'Library panel one',
      newCopyOnSave: true,
      isTitleDuplicateConfirmed: false,
      onTitleDuplicate: () => {},
      newDescription: '',
    });
    return null;
  };
  return {
    SavedObjectSaveModalWithSaveResult: MockSavedObjectSaveModal,
    showSaveModal: (saveModal: React.ReactElement) => {
      render(saveModal);
    },
  };
});

describe('AddToLibraryAction', () => {
  const action = new AddToLibraryAction();
  const saveToLibraryMock = jest.fn(async () => 'libraryId1');
  const replacePanelMock = jest.fn();
  const embeddableApi = {
    checkForDuplicateTitle: async () => {},
    canLinkToLibrary: async () => true,
    canUnlinkFromLibrary: async () => false,
    getSerializedStateByReference: () => ({ savedObjectId: 'libraryId1' }),
    getSerializedStateByValue: () => ({}),
    parentApi: {
      replacePanel: replacePanelMock,
      viewMode$: new BehaviorSubject('edit'),
    },
    saveToLibrary: saveToLibraryMock,
    type: 'testEmbeddable',
    uuid: '1',
  } as AddPanelToLibraryActionApi;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    test('should save panel to library and replace panel with library panel', async () => {
      await action.execute({ embeddable: embeddableApi });
      expect(saveToLibraryMock).toHaveBeenCalled();
      expect(replacePanelMock).toHaveBeenCalledWith('1', {
        panelType: 'testEmbeddable',
        serializedState: {
          savedObjectId: 'libraryId1',
          title: 'Library panel one',
        },
      });
    });
  });
});
