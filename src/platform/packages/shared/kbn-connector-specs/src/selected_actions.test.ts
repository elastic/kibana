/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TEST_CONNECTOR_SUB_ACTION } from './connector_spec';
import {
  filterActionsBySelection,
  formatConnectorActionLine,
  getEffectiveScope,
  isSelectedActionEnabled,
  isSpecificActionsSelection,
  resolveActionScope,
} from './selected_actions';

const ACTIONS = {
  search: { isTool: true, description: 'Search things' },
  send: { isTool: true, description: 'Send things' },
  approve: { isTool: false, description: 'Approve things' },
  noDesc: { isTool: true },
  writeAction: { isTool: true, scope: 'write' as const, description: 'Create things' },
  destroyAction: { isTool: true, scope: 'destroy' as const, description: 'Delete things' },
};

describe('selected_actions helpers', () => {
  describe('isSpecificActionsSelection', () => {
    it('is true only for arrays', () => {
      expect(isSpecificActionsSelection(['search'])).toBe(true);
      expect(isSpecificActionsSelection([])).toBe(true);
      expect(isSpecificActionsSelection(null)).toBe(false);
      expect(isSpecificActionsSelection(undefined)).toBe(false);
    });
  });

  describe('isSelectedActionEnabled', () => {
    it('always allows the reserved test action', () => {
      expect(isSelectedActionEnabled(TEST_CONNECTOR_SUB_ACTION, [])).toBe(true);
      expect(isSelectedActionEnabled(TEST_CONNECTOR_SUB_ACTION, ['search'])).toBe(true);
      expect(isSelectedActionEnabled(TEST_CONNECTOR_SUB_ACTION, undefined)).toBe(true);
    });

    it('in specific mode, only allows listed actions', () => {
      expect(isSelectedActionEnabled('search', ['search'])).toBe(true);
      expect(isSelectedActionEnabled('approve', ['search'])).toBe(false);
      expect(isSelectedActionEnabled('search', [])).toBe(false);
    });

    it('with undefined (unset selection), allows all actions', () => {
      expect(isSelectedActionEnabled('search', undefined)).toBe(true);
      expect(isSelectedActionEnabled('approve', undefined)).toBe(true);
    });

    it('with null (unset selection), allows all actions', () => {
      expect(isSelectedActionEnabled('search', null)).toBe(true);
      expect(isSelectedActionEnabled('approve', null)).toBe(true);
    });
  });

  describe('filterActionsBySelection', () => {
    it('returns all actions when selectedActions is undefined (pre-feature connector)', () => {
      expect(filterActionsBySelection(ACTIONS, undefined).map(([name]) => name)).toEqual([
        'search',
        'send',
        'noDesc',
        'writeAction',
        'destroyAction',
      ]);
    });

    it('returns all actions when selectedActions is null (unset)', () => {
      expect(filterActionsBySelection(ACTIONS, null).map(([name]) => name)).toEqual([
        'search',
        'send',
        'noDesc',
        'writeAction',
        'destroyAction',
      ]);
    });

    it('excludes isTool:false actions even when explicitly listed in specific mode', () => {
      expect(filterActionsBySelection(ACTIONS, ['send', 'approve']).map(([name]) => name)).toEqual([
        'send',
      ]);
    });

    it('can require descriptions', () => {
      expect(
        filterActionsBySelection(ACTIONS, null, { requireDescription: true }).map(([name]) => name)
      ).toEqual(['search', 'send', 'writeAction', 'destroyAction']);
    });
  });

  describe('resolveActionScope', () => {
    it('returns the explicit scope when set', () => {
      expect(resolveActionScope({ scope: 'write' })).toBe('write');
      expect(resolveActionScope({ scope: 'destroy' })).toBe('destroy');
      expect(resolveActionScope({ scope: 'read' })).toBe('read');
    });

    it('maps isTool:false without scope to destroy', () => {
      expect(resolveActionScope({ isTool: false })).toBe('destroy');
    });

    it('defaults to read for isTool:true or unset', () => {
      expect(resolveActionScope({ isTool: true })).toBe('read');
      expect(resolveActionScope({})).toBe('read');
    });

    it('scope field wins over isTool', () => {
      expect(resolveActionScope({ scope: 'write', isTool: false })).toBe('write');
    });
  });

  describe('getEffectiveScope', () => {
    const actionList = [
      { name: 'search', isTool: true as const },
      { name: 'writeAction', isTool: true as const, scope: 'write' as const },
      { name: 'destroyAction', isTool: true as const, scope: 'destroy' as const },
    ];

    it('returns null for empty selection', () => {
      expect(getEffectiveScope(actionList, [])).toBeNull();
    });

    it('returns read for read-only selections', () => {
      expect(getEffectiveScope(actionList, ['search'])).toBe('read');
    });

    it('returns write when write actions are selected', () => {
      expect(getEffectiveScope(actionList, ['search', 'writeAction'])).toBe('write');
    });

    it('returns destroy when destroy actions are selected', () => {
      expect(getEffectiveScope(actionList, ['search', 'writeAction', 'destroyAction'])).toBe(
        'destroy'
      );
    });
  });

  describe('formatConnectorActionLine', () => {
    it('formats read actions without annotation', () => {
      expect(formatConnectorActionLine('search', ACTIONS.search)).toBe('search: Search things');
    });

    it('annotates isTool:false actions with [DESTROY]', () => {
      expect(formatConnectorActionLine('approve', ACTIONS.approve)).toBe(
        'approve [DESTROY]: Approve things'
      );
    });

    it('annotates scope:write actions with [WRITE]', () => {
      expect(formatConnectorActionLine('writeAction', ACTIONS.writeAction)).toBe(
        'writeAction [WRITE]: Create things'
      );
    });

    it('annotates scope:destroy actions with [DESTROY]', () => {
      expect(formatConnectorActionLine('destroyAction', ACTIONS.destroyAction)).toBe(
        'destroyAction [DESTROY]: Delete things'
      );
    });

    it('falls back to the action name when description is missing', () => {
      expect(formatConnectorActionLine('noDesc', ACTIONS.noDesc)).toBe('noDesc: noDesc');
    });
  });
});
