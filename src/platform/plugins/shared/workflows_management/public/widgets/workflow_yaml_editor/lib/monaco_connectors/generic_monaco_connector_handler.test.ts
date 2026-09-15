/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GenericMonacoConnectorHandler } from './generic_monaco_connector_handler';
import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';
import { getCachedAllConnectorsMap } from '../../../../../common/schema';
import { getCachedAllConnectors } from '../connectors_cache';
import { setMockStabilityBadgeThemeForTests } from '../stability/set_mock_stability_badge_theme_for_tests';

jest.mock('../connectors_cache', () => ({
  getCachedAllConnectors: jest.fn(),
}));

jest.mock('../../../../../common/schema', () => ({
  getCachedAllConnectorsMap: jest.fn(),
}));

describe('GenericMonacoConnectorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockStabilityBadgeThemeForTests();
    (getCachedAllConnectorsMap as jest.Mock).mockReturnValue(null);
    (getCachedAllConnectors as jest.Mock).mockReturnValue([
      {
        type: 'slack2.createConversation',
        summary: 'Create Conversation',
        description: 'Creates a Slack conversation.',
      },
    ]);
  });

  it('shows one connector heading with action-specific metadata', async () => {
    const handler = new GenericMonacoConnectorHandler();
    const result = await handler.generateHoverContent(
      createMockHoverContext(
        'slack2.createConversation',
        createMockStepContext({ stepType: 'slack2.createConversation' })
      )
    );

    expect(result?.value).toContain('**Connector**: `slack2.createConversation`');
    expect(result?.value).not.toContain('**Workflow Connector**');
    expect(result?.value).toContain('Creates a Slack conversation.');
    expect(result?.value).toContain('**Action**: Create Conversation');
    expect(result?.value).not.toContain('message');
  });

  it('does not invent examples for generic connector actions', () => {
    const handler = new GenericMonacoConnectorHandler();
    expect(handler.getExamples('slack2.createConversation')).toBeNull();
  });
});
