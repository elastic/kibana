/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, Store } from './editor';
import { reducer, initialValue } from './editor';
import type { DevToolsSettings } from '../../services';
import { DEFAULT_SETTINGS } from '../../services';
import type { TextObject } from '../../../common/text_object';
import { SHELL_TAB_ID } from '../containers/main/constants';
import type { MonacoEditorActionsProvider } from '../containers/editor/monaco_editor_actions_provider';
import { RestoreMethod } from '../../types';

describe('editor store', () => {
  it('should return initial state when no action matches', () => {
    const action = { type: 'unknown' } as any;
    const newState = reducer(initialValue, action);
    expect(newState).toBe(initialValue);
  });

  it('should handle setInputEditor action with immutability', () => {
    const mockEditor = {} as MonacoEditorActionsProvider;
    const action: Action = { type: 'setInputEditor', payload: mockEditor };
    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.ready).toBe(true);

    // Verify immutability
    expect(initialValue.ready).toBe(false);
  });

  it('should handle updateSettings action and replace settings completely', () => {
    const newSettings: DevToolsSettings = {
      ...DEFAULT_SETTINGS,
      fontSize: 16,
      autocomplete: { fields: false, indices: false, templates: false, dataStreams: false },
    };

    const action: Action = { type: 'updateSettings', payload: newSettings };
    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.settings).toBe(newSettings);
    expect(newState.settings.fontSize).toBe(16);

    // Verify original settings unchanged
    expect(initialValue.settings).toBe(DEFAULT_SETTINGS);
  });

  it('should handle setCurrentTextObject action', () => {
    const mockTextObject: TextObject = {
      id: 'test-id',
      text: 'GET /_search',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const action: Action = { type: 'setCurrentTextObject', payload: mockTextObject };
    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.currentTextObject).toBe(mockTextObject);
    expect(initialValue.currentTextObject).toBe(null);
  });

  it('should handle setRequestToRestore action and change view', () => {
    const restorePayload = {
      request: 'GET /_search\n{}',
      restoreMethod: RestoreMethod.RESTORE,
    };

    const stateWithDifferentView: Store = {
      ...initialValue,
      currentView: 'history',
    };

    const action: Action = { type: 'setRequestToRestore', payload: restorePayload };
    const newState = reducer(stateWithDifferentView, action);

    expect(newState).not.toBe(stateWithDifferentView);
    expect(newState.restoreRequestFromHistory).toBe(restorePayload);
    expect(newState.currentView).toBe(SHELL_TAB_ID);

    // Verify original state unchanged
    expect(stateWithDifferentView.currentView).toBe('history');
    expect(stateWithDifferentView.restoreRequestFromHistory).toBe(null);
  });

  it('should handle setCurrentView action', () => {
    const action: Action = { type: 'setCurrentView', payload: 'history' };
    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.currentView).toBe('history');
    expect(initialValue.currentView).toBe(SHELL_TAB_ID);
  });

  it('should handle clearRequestToRestore action', () => {
    const stateWithRestore: Store = {
      ...initialValue,
      restoreRequestFromHistory: {
        request: 'GET /',
        restoreMethod: RestoreMethod.RESTORE,
      },
    };

    const action: Action = { type: 'clearRequestToRestore' };
    const newState = reducer(stateWithRestore, action);

    expect(newState).not.toBe(stateWithRestore);
    expect(newState.restoreRequestFromHistory).toBe(null);
    expect(stateWithRestore.restoreRequestFromHistory).not.toBe(null);
  });

  it('should handle setFileToImport action', () => {
    const fileContent = 'GET /_search\n{\n  "query": { "match_all": {} }\n}';
    const action: Action = { type: 'setFileToImport', payload: fileContent };
    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.fileToImport).toBe(fileContent);
    expect(initialValue.fileToImport).toBe(null);
  });

  it('should ensure deep cloning for nested objects', () => {
    const stateWithNested: Store = {
      ...initialValue,
      settings: {
        ...DEFAULT_SETTINGS,
        autocomplete: { fields: true, indices: true, templates: true, dataStreams: true },
      },
    };

    const newSettings: DevToolsSettings = {
      ...DEFAULT_SETTINGS,
      autocomplete: { fields: false, indices: false, templates: false, dataStreams: false },
    };

    const action: Action = { type: 'updateSettings', payload: newSettings };
    const newState = reducer(stateWithNested, action);

    // Verify deep immutability
    expect(stateWithNested.settings.autocomplete.fields).toBe(true);
    expect(newState.settings.autocomplete.fields).toBe(false);
  });
});
