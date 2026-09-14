/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { parseLineForCompletion } from '@kbn/workflows-yaml';
import { getConnectorIdSuggestions } from './get_connector_id_suggestions';
import type { AutocompleteContext } from '../../context/autocomplete.types';

describe('getConnectorIdSuggestions', () => {
  const fakeConnectorTypes: Record<string, ConnectorTypeInfo> = {
    '.slack': {
      actionTypeId: '.slack',
      displayName: 'Slack',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      subActions: [],
      instances: [
        { id: 'public-slack', name: 'Public Slack', isPreconfigured: false, isDeprecated: false },
        { id: 'private-slack', name: 'Private Slack', isPreconfigured: false, isDeprecated: false },
      ],
    },
    '.inference': {
      actionTypeId: '.inference',
      displayName: 'Inference',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      subActions: [],
      instances: [
        { id: 'openai', name: 'OpenAI', isPreconfigured: false, isDeprecated: false },
        { id: 'gemini', name: 'Gemini', isPreconfigured: false, isDeprecated: false },
      ],
    },
  };
  it('should return an empty array if the line parse result is null', () => {
    const result = getConnectorIdSuggestions({
      line: '',
      lineParseResult: null,
      range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
      focusedStepInfo: null,
      dynamicConnectorTypes: null,
    } as AutocompleteContext);
    expect(result).toEqual([]);
  });

  it('should return a list of available instances for the current step connector type', () => {
    const line = 'connector-id: ';
    const result = getConnectorIdSuggestions({
      line,
      lineParseResult: parseLineForCompletion(line),
      range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: line.length + 1 },
      focusedStepInfo: { stepType: 'slack' },
      focusedYamlPair: null,
      path: ['steps', 0, 'connector-id'],
      dynamicConnectorTypes: fakeConnectorTypes,
    } as unknown as AutocompleteContext);

    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('Public Slack • public-slack');
    expect(result[0].insertText).toBe('public-slack');
    expect(result[1].label).toBe('Private Slack • private-slack');
    expect(result[1].insertText).toBe('private-slack');
    expect(result[2].label).toBe('Create a new connector');
    expect(result[2].insertText).toBe('');
  });

  it('should suggest slack connectors for waitForApproval channel connector-id', () => {
    const line = '        connector-id: ';
    const result = getConnectorIdSuggestions({
      line,
      lineParseResult: parseLineForCompletion(line),
      range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: line.length + 1 },
      focusedStepInfo: { stepType: 'waitForApproval' },
      focusedYamlPair: {
        path: ['with', 'channels', 'slack', 'connector-id'],
      },
      path: ['steps', 0, 'with', 'channels', 'slack', 'connector-id'],
      dynamicConnectorTypes: fakeConnectorTypes,
    } as unknown as AutocompleteContext);

    expect(result).toHaveLength(3);
    expect(result[0].insertText).toBe('public-slack');
  });

  it('should suggest inbound webhook instances for a trigger connector-id', () => {
    const line = '    connector-id: ';
    const yamlDocument = parseDocument(`triggers:
  - type: inboundWebhook.received
    connector-id: 
`);
    const result = getConnectorIdSuggestions({
      line,
      lineParseResult: parseLineForCompletion(line),
      range: { startLineNumber: 3, endLineNumber: 3, startColumn: 19, endColumn: line.length + 1 },
      focusedStepInfo: null,
      focusedYamlPair: null,
      path: ['triggers', 0, 'connector-id'],
      yamlDocument,
      dynamicConnectorTypes: {
        ...fakeConnectorTypes,
        '.inboundWebhook': {
          actionTypeId: '.inboundWebhook',
          displayName: 'Inbound Webhook',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          subActions: [],
          instances: [
            { id: 'testyng', name: 'testyng', isPreconfigured: false, isDeprecated: false },
          ],
        },
      },
    } as unknown as AutocompleteContext);

    expect(result.map((item) => item.insertText)).toContain('testyng');
    expect(result[0].label).toContain('testyng');
  });
});
