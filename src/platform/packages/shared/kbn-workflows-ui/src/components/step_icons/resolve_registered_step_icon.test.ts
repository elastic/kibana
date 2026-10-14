/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { resolveRegisteredStepIcon } from './resolve_registered_step_icon';
import { createMockWorkflowsUiServices } from '../../context/__mocks__/mocks';

jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map([['.abuseipdb', 'plugs']]),
}));

describe('resolveRegisteredStepIcon', () => {
  it('prefers a workflows extensions step definition icon', () => {
    const { workflowsExtensions, triggersActionsUi } = createMockWorkflowsUiServices();
    jest.mocked(workflowsExtensions.getStepDefinition).mockReturnValue({
      id: 'cases.createCase',
      icon: 'casesApp',
    } as unknown as PublicStepDefinition);

    expect(
      resolveRegisteredStepIcon('cases.createCase', {
        workflowsExtensions,
        actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
      })
    ).toBe('casesApp');
  });

  it('falls back to a family sibling registered under the base type', () => {
    const { workflowsExtensions, triggersActionsUi } = createMockWorkflowsUiServices();
    jest
      .mocked(workflowsExtensions.getAllStepDefinitions)
      .mockReturnValue([
        { id: 'cases.noop' },
        { id: 'cases.createCase', icon: 'briefcase' },
      ] as unknown as PublicStepDefinition[]);

    expect(
      resolveRegisteredStepIcon('cases', {
        workflowsExtensions,
        actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
      })
    ).toBe('briefcase');
  });

  it('resolves a connector spec icon when no extension icon exists', () => {
    const { workflowsExtensions, triggersActionsUi } = createMockWorkflowsUiServices();

    expect(
      resolveRegisteredStepIcon('abuseipdb.checkIp', {
        workflowsExtensions,
        actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
      })
    ).toBe('plugs');
  });

  it('resolves a connector icon from the action-type registry (e.g. webhook)', () => {
    const { workflowsExtensions, triggersActionsUi } = createMockWorkflowsUiServices();
    triggersActionsUi.actionTypeRegistry.register({
      id: '.webhook',
      iconClass: 'logoWebhook',
    } as unknown as ActionTypeModel);

    expect(
      resolveRegisteredStepIcon('webhook.run', {
        workflowsExtensions,
        actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
      })
    ).toBe('logoWebhook');
  });

  it('returns undefined when no registered source has an icon', () => {
    const { workflowsExtensions, triggersActionsUi } = createMockWorkflowsUiServices();

    expect(
      resolveRegisteredStepIcon('unknown_connector.doThing', {
        workflowsExtensions,
        actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
      })
    ).toBeUndefined();
  });
});
