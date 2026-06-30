/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isConnectorMetaSubAction,
  isConnectorSubActionAllowed,
  partitionToolSubActions,
} from './connector_meta_sub_actions';

describe('connector meta sub-actions', () => {
  it('identifies meta sub-actions', () => {
    expect(isConnectorMetaSubAction('listTools')).toBe(true);
    expect(isConnectorMetaSubAction('callTool')).toBe(true);
    expect(isConnectorMetaSubAction('searchIssues')).toBe(false);
  });

  it('partitions tool sub-actions into meta and restrictable', () => {
    expect(
      partitionToolSubActions(['searchIssues', 'listTools', 'getIssue', 'callTool'])
    ).toEqual({
      metaSubActions: ['listTools', 'callTool'],
      restrictableSubActions: ['searchIssues', 'getIssue'],
    });
  });

  it('always allows meta sub-actions when restrictions are set', () => {
    const allowedSubActions = ['searchIssues'];

    expect(isConnectorSubActionAllowed('searchIssues', allowedSubActions)).toBe(true);
    expect(isConnectorSubActionAllowed('getIssue', allowedSubActions)).toBe(false);
    expect(isConnectorSubActionAllowed('listTools', allowedSubActions)).toBe(true);
    expect(isConnectorSubActionAllowed('callTool', allowedSubActions)).toBe(true);
  });
});
