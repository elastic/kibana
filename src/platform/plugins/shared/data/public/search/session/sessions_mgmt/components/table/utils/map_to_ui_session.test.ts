/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchSessionStatus } from '../../../../../../../common';
import { getSearchSessionSavedObjectMock } from '../../../__mocks__';
import type { LocatorsStart } from '../../../types';
import { ACTION } from '../../../types';
import { mapToUISession } from './map_to_ui_session';

describe('mapToUISession', () => {
  describe('when the actions are not filtered', () => {
    it('should map SearchSessionSavedObject to UISession', () => {
      // Given
      const mockSearchSession = getSearchSessionSavedObjectMock();
      const mockLocators = {
        get: jest.fn().mockReturnValue({
          getRedirectUrl: jest
            .fn()
            .mockReturnValueOnce('reload-url')
            .mockReturnValueOnce('restore-url'),
        }),
      } as unknown as LocatorsStart;
      const sessionStatuses = {
        [mockSearchSession.id]: {
          status: SearchSessionStatus.COMPLETE,
          errors: ['some error'],
        },
      };

      // When
      const uiSession = mapToUISession({
        savedObject: mockSearchSession,
        locators: mockLocators,
        sessionStatuses,
      });

      // Then
      expect(uiSession).toEqual({
        id: mockSearchSession.id,
        name: mockSearchSession.attributes.name,
        appId: mockSearchSession.attributes.appId,
        created: mockSearchSession.attributes.created,
        expires: mockSearchSession.attributes.expires,
        status: SearchSessionStatus.COMPLETE,
        actions: [ACTION.INSPECT, ACTION.RENAME, ACTION.EXTEND, ACTION.DELETE],
        restoreUrl: 'restore-url',
        reloadUrl: 'reload-url',
        initialState: mockSearchSession.attributes.initialState,
        restoreState: mockSearchSession.attributes.restoreState,
        idMapping: mockSearchSession.attributes.idMapping,
        numSearches: Object.keys(mockSearchSession.attributes.idMapping).length,
        version: mockSearchSession.attributes.version,
        errors: ['some error'],
      });
    });
  });

  describe('when the actions are filtered', () => {
    it('should map SearchSessionSavedObject to UISession', () => {
      // Given
      const mockSearchSession = getSearchSessionSavedObjectMock();
      const mockLocators = {
        get: jest.fn().mockReturnValue({
          getRedirectUrl: jest
            .fn()
            .mockReturnValueOnce('reload-url')
            .mockReturnValueOnce('restore-url'),
        }),
      } as unknown as LocatorsStart;
      const sessionStatuses = {
        [mockSearchSession.id]: {
          status: SearchSessionStatus.COMPLETE,
          errors: ['some error'],
        },
      };

      // When
      const uiSession = mapToUISession({
        savedObject: mockSearchSession,
        locators: mockLocators,
        sessionStatuses,
        actions: [ACTION.INSPECT, ACTION.RENAME], // Filtering actions to only include 'inspect' and 'rename'
      });

      // Then
      expect(uiSession).toEqual({
        id: mockSearchSession.id,
        name: mockSearchSession.attributes.name,
        appId: mockSearchSession.attributes.appId,
        created: mockSearchSession.attributes.created,
        expires: mockSearchSession.attributes.expires,
        status: SearchSessionStatus.COMPLETE,
        actions: [ACTION.INSPECT, ACTION.RENAME],
        restoreUrl: 'restore-url',
        reloadUrl: 'reload-url',
        initialState: mockSearchSession.attributes.initialState,
        restoreState: mockSearchSession.attributes.restoreState,
        idMapping: mockSearchSession.attributes.idMapping,
        numSearches: Object.keys(mockSearchSession.attributes.idMapping).length,
        version: mockSearchSession.attributes.version,
        errors: ['some error'],
      });
    });
  });
});
