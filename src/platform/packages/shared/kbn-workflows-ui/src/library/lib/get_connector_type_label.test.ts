/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { getConnectorTypeLabel } from './get_connector_type_label';
import { createMockWorkflowsUiServices } from '../../context/__mocks__/mocks';

const createRegistry = (models: Array<Partial<ActionTypeModel>> = []) => {
  const { triggersActionsUi } = createMockWorkflowsUiServices();
  for (const model of models) {
    triggersActionsUi.actionTypeRegistry.register(model as ActionTypeModel);
  }
  return triggersActionsUi.actionTypeRegistry;
};

describe('getConnectorTypeLabel', () => {
  it('should use the registered action type title', () => {
    const registry = createRegistry([{ id: '.slack', actionTypeTitle: 'Slack' }]);

    expect(getConnectorTypeLabel('.slack', registry)).toBe('Slack');
  });

  it('should fall back to the select message when there is no action type title', () => {
    const registry = createRegistry([{ id: '.jira', selectMessage: 'Create a Jira issue' }]);

    expect(getConnectorTypeLabel('.jira', registry)).toBe('Create a Jira issue');
  });

  it('should fall back to the capitalized base type for an unregistered connector', () => {
    const registry = createRegistry();

    expect(getConnectorTypeLabel('.abuseipdb', registry)).toBe('Abuseipdb');
    // `slack_api` is registered as `.slack_api` but belongs to the slack family.
    expect(getConnectorTypeLabel('slack_api', registry)).toBe('Slack');
  });

  it('should resolve a connector type given without the leading dot', () => {
    const registry = createRegistry([{ id: '.email', actionTypeTitle: 'Email' }]);

    expect(getConnectorTypeLabel('email', registry)).toBe('Email');
  });
});
