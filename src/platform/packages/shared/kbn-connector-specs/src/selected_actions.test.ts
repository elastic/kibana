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
  HITL_ACTION_CONFIRMATION_SUFFIX,
  isSelectedActionEnabled,
  isSpecificActionsSelection,
} from './selected_actions';

const ACTIONS = {
  search: { isTool: true, description: 'Search things' },
  send: { isTool: true, description: 'Send things' },
  approve: { isTool: false, description: 'Approve things' },
  noDesc: { isTool: true },
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
      expect(isSelectedActionEnabled(TEST_CONNECTOR_SUB_ACTION, [], ACTIONS)).toBe(true);
      expect(isSelectedActionEnabled(TEST_CONNECTOR_SUB_ACTION, ['search'], ACTIONS)).toBe(true);
      expect(isSelectedActionEnabled(TEST_CONNECTOR_SUB_ACTION, undefined, ACTIONS)).toBe(true);
    });

    it('in specific mode, only allows listed actions', () => {
      expect(isSelectedActionEnabled('search', ['search'], ACTIONS)).toBe(true);
      expect(isSelectedActionEnabled('approve', ['search'], ACTIONS)).toBe(false);
      expect(isSelectedActionEnabled('search', [], ACTIONS)).toBe(false);
    });

    it('in recommended mode, only allows isTool actions', () => {
      expect(isSelectedActionEnabled('search', undefined, ACTIONS)).toBe(true);
      expect(isSelectedActionEnabled('approve', null, ACTIONS)).toBe(false);
    });

    it('in recommended mode without an actions map, allows the action', () => {
      expect(isSelectedActionEnabled('anything', undefined)).toBe(true);
    });
  });

  describe('filterActionsBySelection', () => {
    it('returns isTool actions in recommended mode', () => {
      expect(filterActionsBySelection(ACTIONS, undefined).map(([name]) => name)).toEqual([
        'search',
        'send',
        'noDesc',
      ]);
    });

    it('returns allowlisted actions in specific mode, including HITL', () => {
      expect(
        filterActionsBySelection(ACTIONS, ['send', 'approve']).map(([name]) => name)
      ).toEqual(['send', 'approve']);
    });

    it('can require descriptions', () => {
      expect(
        filterActionsBySelection(ACTIONS, undefined, { requireDescription: true }).map(
          ([name]) => name
        )
      ).toEqual(['search', 'send']);
    });
  });

  describe('formatConnectorActionLine', () => {
    it('formats tool actions without a HITL suffix', () => {
      expect(formatConnectorActionLine('search', ACTIONS.search)).toBe('search: Search things');
    });

    it('appends a HITL suffix for non-tool actions', () => {
      expect(formatConnectorActionLine('approve', ACTIONS.approve)).toBe(
        `approve: Approve things${HITL_ACTION_CONFIRMATION_SUFFIX}`
      );
    });

    it('falls back to the action name when description is missing', () => {
      expect(formatConnectorActionLine('noDesc', ACTIONS.noDesc)).toBe('noDesc: noDesc');
    });
  });
});
