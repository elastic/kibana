/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type LineCounter, Scalar } from 'yaml';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { validateUnavailableConnectorActions } from './validate_unavailable_connector_actions';
import type { StepPropInfo } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { createStepInfo, createWorkflowLookup } from '../../../shared/test_utils';

const mockLineCounter: LineCounter = {
  linePos: (offset: number) => ({ line: offset + 1, col: 1 }),
  lineStarts: [],
  addNewLine: (offset: number) => offset + 1,
};

const createPropInfo = (path: string[], value: unknown, start: number): StepPropInfo => {
  const keyNode = new Scalar(path[path.length - 1]);
  keyNode.range = [0, 4, 4];
  const valueNode = new Scalar(value);
  valueNode.range = [start, start + 10, start + 10];
  return { path, keyNode, valueNode };
};

const connectorTypes: Record<string, ConnectorTypeInfo> = {
  '.slack2': {
    actionTypeId: '.slack2',
    displayName: 'Slack (v2)',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'enterprise',
    subActions: [
      { name: 'searchMessages', displayName: 'Search messages' },
      { name: 'sendMessage', displayName: 'Send message' },
    ],
    instances: [
      {
        id: 'slack-webhook',
        name: 'Slack webhook',
        isPreconfigured: false,
        isDeprecated: false,
        supportedSubActions: ['sendMessage'],
      },
    ],
  },
};

describe('validateUnavailableConnectorActions', () => {
  it('warns when the selected connector auth does not support the action', () => {
    const step = createStepInfo({
      stepId: 'search_slack',
      stepType: 'slack2.searchMessages',
      propInfos: {
        type: createPropInfo(['type'], 'slack2.searchMessages', 10),
        'connector-id': createPropInfo(['connector-id'], 'slack-webhook', 30),
      },
    });

    const results = validateUnavailableConnectorActions(
      createWorkflowLookup([step]),
      connectorTypes,
      mockLineCounter
    );

    expect(results).toEqual([
      expect.objectContaining({
        owner: 'connector-capability-validation',
        severity: 'warning',
        message: expect.stringContaining(
          'Action "searchMessages" is not available for connector "Slack webhook"'
        ),
      }),
    ]);
  });

  it('does not warn for a supported action', () => {
    const step = createStepInfo({
      stepId: 'send_slack',
      stepType: 'slack2.sendMessage',
      propInfos: {
        type: createPropInfo(['type'], 'slack2.sendMessage', 10),
        'connector-id': createPropInfo(['connector-id'], 'slack-webhook', 30),
      },
    });

    expect(
      validateUnavailableConnectorActions(
        createWorkflowLookup([step]),
        connectorTypes,
        mockLineCounter
      )
    ).toEqual([]);
  });
});
