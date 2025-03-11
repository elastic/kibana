/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTypeModel, RuleTypeParams, RuleTypeWithDescription } from '../common';
import { getActionGroups, getSelectedActionGroup } from './get_selected_action_group';

describe('getActionGroups', () => {
  test('should get action groups when setting recovery context', () => {
    const actionGroups = getActionGroups({
      ruleType: {
        actionGroups: [
          {
            id: 'group-1',
            name: 'group-1',
          },
          {
            id: 'group-2',
            name: 'group-2',
          },
        ],
        recoveryActionGroup: {
          id: 'group-1',
        },
        doesSetRecoveryContext: true,
      } as RuleTypeWithDescription,
      ruleTypeModel: {
        defaultRecoveryMessage: 'default recovery message',
        defaultActionMessage: 'default action message',
      } as RuleTypeModel<RuleTypeParams>,
    });

    expect(actionGroups).toEqual([
      {
        defaultActionMessage: 'default recovery message',
        id: 'group-1',
        name: 'group-1',
        omitMessageVariables: 'keepContext',
      },
      {
        defaultActionMessage: 'default action message',
        id: 'group-2',
        name: 'group-2',
      },
    ]);
  });

  test('should get action groups when not setting recovery context', () => {
    const actionGroups = getActionGroups({
      ruleType: {
        actionGroups: [
          {
            id: 'group-1',
            name: 'group-1',
          },
          {
            id: 'group-2',
            name: 'group-2',
          },
        ],
        recoveryActionGroup: {
          id: 'group-1',
        },
        doesSetRecoveryContext: false,
      } as RuleTypeWithDescription,
      ruleTypeModel: {
        defaultRecoveryMessage: 'default recovery message',
        defaultActionMessage: 'default action message',
      } as RuleTypeModel<RuleTypeParams>,
    });

    expect(actionGroups).toEqual([
      {
        defaultActionMessage: 'default recovery message',
        id: 'group-1',
        name: 'group-1',
        omitMessageVariables: 'all',
      },
      {
        defaultActionMessage: 'default action message',
        id: 'group-2',
        name: 'group-2',
      },
    ]);
  });
});

describe('getSelectedActionGroup', () => {
  test('should get selected action group', () => {
    const result = getSelectedActionGroup({
      group: 'group-1',
      ruleType: {
        actionGroups: [
          {
            id: 'group-1',
            name: 'group-1',
          },
          {
            id: 'group-2',
            name: 'group-2',
          },
        ],
        recoveryActionGroup: {
          id: 'group-1',
        },
        doesSetRecoveryContext: false,
      } as RuleTypeWithDescription,
      ruleTypeModel: {
        defaultRecoveryMessage: 'default recovery message',
        defaultActionMessage: 'default action message',
      } as RuleTypeModel<RuleTypeParams>,
    });

    expect(result).toEqual({
      defaultActionMessage: 'default recovery message',
      id: 'group-1',
      name: 'group-1',
      omitMessageVariables: 'all',
    });
  });
});
