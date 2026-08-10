/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { setMockStabilityBadgeThemeForTests } from '../../stability/set_mock_stability_badge_theme_for_tests';
import { getFakeAutocompleteContextParams } from '../context/build_autocomplete_context.test';
import { getCompletionItemProvider } from '../get_completion_item_provider';
import {
  clearAllYamlProviders,
  interceptMonacoYamlProvider,
} from '../intercept_monaco_yaml_provider';

const connectorTypes: Record<string, ConnectorTypeInfo> = {
  '.slack2': {
    actionTypeId: '.slack2',
    displayName: 'Slack',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'enterprise',
    subActions: [
      { name: 'createConversation', displayName: 'Create conversation' },
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
      {
        id: 'slack-bot-token',
        name: 'Slack bot token',
        isPreconfigured: false,
        isDeprecated: false,
        supportedSubActions: ['createConversation', 'sendMessage'],
      },
    ],
  },
  '.email': {
    actionTypeId: '.email',
    displayName: 'Email',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'gold',
    instances: [],
    subActions: [],
  },
};

const getSuggestions = async (yamlContent: string): Promise<monaco.languages.CompletionItem[]> => {
  const params = getFakeAutocompleteContextParams(yamlContent, connectorTypes);
  const provider = getCompletionItemProvider(() => params.editorState);
  const result = await provider.provideCompletionItems(
    params.model,
    params.position,
    params.completionContext,
    {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    }
  );
  return result?.suggestions ?? [];
};

const getSlackSuggestionIds = (suggestions: monaco.languages.CompletionItem[]) =>
  suggestions
    .map(({ filterText }) => filterText)
    .filter((filterText) => filterText?.startsWith('slack2.'));

describe('getCompletionItemProvider - connector capabilities', () => {
  beforeAll(() => {
    setMockStabilityBadgeThemeForTests();
  });

  beforeEach(() => {
    clearAllYamlProviders();
    interceptMonacoYamlProvider();
    monaco.languages.registerCompletionItemProvider(YAML_LANG_ID, {
      provideCompletionItems: jest.fn().mockResolvedValue({
        suggestions: [
          {
            label: 'Search Messages',
            insertText: 'slack2.searchMessages',
            filterText: 'slack2.searchMessages',
          },
          {
            label: 'Send Message',
            insertText: 'slack2.sendMessage',
            filterText: 'slack2.sendMessage',
          },
        ],
      }),
    });
  });

  afterEach(() => {
    clearAllYamlProviders();
  });

  it('marks actions unsupported by the selected connector credentials as unavailable', async () => {
    const suggestions = await getSuggestions(`
name: Slack
enabled: true
triggers:
  - type: manual
steps:
  - name: slack
    type: slack2.se|<-
    connector-id: slack-webhook
    with: {}
`);

    expect(getSlackSuggestionIds(suggestions)).toEqual([
      'slack2.searchMessages',
      'slack2.sendMessage',
    ]);
    expect(
      suggestions.find(({ filterText }) => filterText === 'slack2.searchMessages')
    ).toMatchObject({
      label: {
        description: 'Unavailable',
      },
      preselect: false,
    });
  });

  it('provides supported and unavailable actions without the YAML schema provider', async () => {
    clearAllYamlProviders();

    const suggestions = await getSuggestions(`
name: Slack
enabled: true
triggers:
  - type: manual
steps:
  - name: slack
    type: slack2.|<-
    connector-id: slack-bot-token
    with: {}
`);

    expect(getSlackSuggestionIds(suggestions)).toEqual([
      'slack2.createConversation',
      'slack2.searchMessages',
      'slack2.sendMessage',
    ]);
  });
});
