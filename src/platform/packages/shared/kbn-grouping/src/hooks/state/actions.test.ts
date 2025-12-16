/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupActions } from './actions';
import { ActionType } from '../types';

describe('groupActions', () => {
  describe('updateActiveGroups', () => {
    it('should create an action to update active groups', () => {
      const activeGroups = ['group1', 'group2'];
      const id = 'test-id';
      const expectedAction = {
        type: ActionType.updateActiveGroups,
        payload: {
          activeGroups,
          id,
        },
      };

      expect(groupActions.updateActiveGroups({ activeGroups, id })).toEqual(expectedAction);
    });
  });

  describe('updateGroupOptions', () => {
    it('should create an action to update group options', () => {
      const newOptionList = [
        { key: 'key1', label: 'Label 1' },
        { key: 'key2', label: 'Label 2' },
      ];
      const id = 'test-id';
      const expectedAction = {
        type: ActionType.updateGroupOptions,
        payload: {
          newOptionList,
          id,
        },
      };

      expect(groupActions.updateGroupOptions({ newOptionList, id })).toEqual(expectedAction);
    });
  });

  describe('updateGroupSettings', () => {
    it('should create an action to update group settings', () => {
      const settings = {
        hideNoneOption: true,
        hideCustomFieldOption: false,
        hideOptionsTitle: true,
        popoverButtonLabel: 'Custom Label',
      };
      const id = 'test-id';
      const expectedAction = {
        type: ActionType.updateGroupSettings,
        payload: {
          settings,
          id,
        },
      };

      expect(groupActions.updateGroupSettings({ settings, id })).toEqual(expectedAction);
    });

    it('should create an action to update group settings with undefined settings', () => {
      const id = 'test-id';
      const expectedAction = {
        type: ActionType.updateGroupSettings,
        payload: {
          settings: undefined,
          id,
        },
      };

      expect(groupActions.updateGroupSettings({ settings: undefined, id })).toEqual(expectedAction);
    });
  });
});
