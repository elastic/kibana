/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_GENERIC_REQUEST_DESCRIPTION } from '@kbn/connector-specs';
import { SpecConnectorMonacoHandler } from './spec_connector_handler';
import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';
import { setMockStabilityBadgeThemeForTests } from '../stability/set_mock_stability_badge_theme_for_tests';

jest.mock('../../../../../common/schema', () => ({
  getCachedAllConnectorsMap: jest.fn(() => new Map()),
}));

jest.mock('../connectors_cache', () => ({
  getCachedAllConnectors: jest.fn(() => []),
}));

describe('SpecConnectorMonacoHandler', () => {
  let handler: SpecConnectorMonacoHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockStabilityBadgeThemeForTests();
    handler = new SpecConnectorMonacoHandler();
  });

  describe('canHandle', () => {
    it('handles a known connector-spec action', () => {
      expect(handler.canHandle('zoom.whoAmI')).toBe(true);
    });

    it('handles the synthesized request action', () => {
      expect(handler.canHandle('zoom.request')).toBe(true);
    });

    it('does not handle unknown connector types', () => {
      expect(handler.canHandle('kibana.createSpace')).toBe(false);
      expect(handler.canHandle('not-a-connector')).toBe(false);
      expect(handler.canHandle('unknownspec.request')).toBe(false);
    });
  });

  describe('generateHoverContent', () => {
    it("renders a defined action's real description", async () => {
      const context = createMockHoverContext(
        'zoom.whoAmI',
        createMockStepContext({ stepType: 'zoom.whoAmI' })
      );

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result!.value).toContain('**Connector**: `Zoom`');
      expect(result!.value).toContain('**Action**: `whoAmI`');
      expect(result!.value).toContain('profile of the currently authenticated Zoom user');
    });

    it('renders the default generic request description for the request action', async () => {
      const context = createMockHoverContext(
        'zoom.request',
        createMockStepContext({ stepType: 'zoom.request' })
      );

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result!.value).toContain('**Action**: `request`');
      expect(result!.value).toContain(DEFAULT_GENERIC_REQUEST_DESCRIPTION);
    });

    it('shows the resolved base URL for a constant-host connector request', async () => {
      const context = createMockHoverContext(
        'zoom.request',
        createMockStepContext({ stepType: 'zoom.request' })
      );

      const result = await handler.generateHoverContent(context);

      expect(result!.value).toContain('**Base URL**');
      expect(result!.value).toContain('`https://api.zoom.us`');
    });

    it('notes a config-derived base URL cannot be resolved at authoring time', async () => {
      const context = createMockHoverContext(
        'zendesk.request',
        createMockStepContext({ stepType: 'zendesk.request' })
      );

      const result = await handler.generateHoverContent(context);

      expect(result!.value).toContain('**Base URL**');
      expect(result!.value).toContain('resolved from the connector configuration');
      expect(result!.value).not.toContain('.zendesk.com');
    });

    it('notes url-only for a multi-host connector without a base URL', async () => {
      const context = createMockHoverContext(
        'amazon_s3.request',
        createMockStepContext({ stepType: 'amazon_s3.request' })
      );

      const result = await handler.generateHoverContent(context);

      expect(result!.value).toContain('**Base URL**');
      expect(result!.value).toContain('absolute `url`');
    });

    it('does not show a base URL line for non-request actions', async () => {
      const context = createMockHoverContext(
        'zoom.whoAmI',
        createMockStepContext({ stepType: 'zoom.whoAmI' })
      );

      const result = await handler.generateHoverContent(context);

      expect(result!.value).not.toContain('**Base URL**');
    });

    it('returns null when there is no step context', async () => {
      const context = createMockHoverContext('zoom.whoAmI');

      const result = await handler.generateHoverContent(context);

      expect(result).toBeNull();
    });

    it('returns null for an unknown action on a known connector', async () => {
      const context = createMockHoverContext(
        'zoom.definitelyNotAnAction',
        createMockStepContext({ stepType: 'zoom.definitelyNotAnAction' })
      );

      const result = await handler.generateHoverContent(context);

      expect(result).toBeNull();
    });
  });
});
