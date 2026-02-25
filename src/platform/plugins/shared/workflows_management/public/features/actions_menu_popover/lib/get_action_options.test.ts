/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { isDynamicConnector } from '@kbn/workflows';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';
import { flattenOptions, getActionOptions } from './get_action_options';
import { getAllConnectors } from '../../../../common/schema';
import { getStepIconType } from '../../../shared/ui/step_icons/get_step_icon_type';
import type { ActionOptionData } from '../types';
import { isActionGroup, isActionOption } from '../types';

jest.mock('../../../../common/schema', () => ({
  getAllConnectors: jest.fn(),
}));
jest.mock('../../../trigger_schemas', () => ({
  triggerSchemas: { getTriggerDefinitions: jest.fn(() => []) },
}));
jest.mock('@kbn/workflows', () => ({
  isDynamicConnector: jest.fn(),
}));
jest.mock('../../../shared/ui/step_icons/get_step_icon_type', () => ({
  getStepIconType: jest.fn(),
}));
jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn(
      (key: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage
    ),
  },
}));

describe('getActionOptions', () => {
  const mockEuiTheme = {
    colors: {
      vis: {
        euiColorVis0: '#color0',
        euiColorVis6: '#color6',
      },
      textParagraph: '#textColor',
    },
  } as unknown as EuiThemeComputed<{}>;

  let mockWorkflowsExtensions: jest.Mocked<WorkflowsExtensionsPublicPluginStart>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWorkflowsExtensions = {
      getStepDefinition: jest.fn(),
      getAllStepDefinitions: jest.fn(),
      hasStepDefinition: jest.fn(),
      getAllTriggerDefinitions: jest.fn(() => []),
      getTriggerDefinition: jest.fn(),
      hasTriggerDefinition: jest.fn(),
    };

    (getAllConnectors as jest.Mock).mockReturnValue([]);
    (isDynamicConnector as jest.MockedFunction<typeof isDynamicConnector>).mockImplementation(
      () => false
    );
    (getStepIconType as jest.Mock).mockReturnValue('plugs');
  });

  it('should return all base action groups', () => {
    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);

    expect(result).toHaveLength(8);
    expect(result[0].id).toBe('triggers');
    expect(result[1].id).toBe('elasticsearch');
    expect(result[2].id).toBe('kibana');
    expect(result[3].id).toBe('ai');
    expect(result[4].id).toBe('data');
    expect(result[5].id).toBe('external');
    expect(result[6].id).toBe('http');
    expect(result[7].id).toBe('flowControl');
  });

  it('should include trigger options', () => {
    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const triggersGroup = result.find((group) => group.id === 'triggers');

    expect(triggersGroup).toBeDefined();
    if (triggersGroup && 'options' in triggersGroup) {
      expect(triggersGroup.options).toHaveLength(3);
      expect(triggersGroup.options.map((opt) => opt.id)).toEqual(['manual', 'alert', 'scheduled']);
    }
  });

  it('should include flow control options', () => {
    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const flowControlGroup = result.find((group) => group.id === 'flowControl');

    expect(flowControlGroup).toBeDefined();
    if (flowControlGroup && 'options' in flowControlGroup) {
      expect(flowControlGroup.options).toHaveLength(3);
      expect(flowControlGroup.options.map((opt) => opt.id)).toEqual(['if', 'foreach', 'wait']);
    }
  });

  it('should add connectors with custom step definitions to appropriate groups', () => {
    const mockConnector = {
      type: 'custom.connector',
      description: 'Custom Connector',
    };

    const mockStepDefinition = {
      id: 'custom.connector',
      label: 'Custom Connector Label',
      description: 'Custom Connector Description',
      icon: 'customIcon',
      actionsMenuCatalog: 'kibana' as const,
      inputSchema: z.object({}),
      outputSchema: z.object({}),
    };

    (getAllConnectors as jest.Mock).mockReturnValue([mockConnector]);
    mockWorkflowsExtensions.getStepDefinition.mockReturnValue(mockStepDefinition as any);

    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const kibanaGroup = result.find((group) => group.id === 'kibana');

    expect(kibanaGroup).toBeDefined();
    if (kibanaGroup && isActionGroup(kibanaGroup)) {
      expect(kibanaGroup.options).toHaveLength(1);
      const option = kibanaGroup.options[0];
      expect(option.id).toBe('custom.connector');
      expect(option.label).toBe('Custom Connector Label');
      if (isActionOption(option)) {
        expect(option.iconType).toBe('customIcon');
      }
    }
  });

  it('should add elasticsearch connectors to elasticsearch group', () => {
    const mockConnector = {
      type: 'elasticsearch.search',
      description: 'Elasticsearch Search',
    };

    (getAllConnectors as jest.Mock).mockReturnValue([mockConnector]);
    mockWorkflowsExtensions.getStepDefinition.mockReturnValue(undefined);

    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const elasticsearchGroup = result.find((group) => group.id === 'elasticsearch');

    expect(elasticsearchGroup).toBeDefined();
    if (elasticsearchGroup && isActionGroup(elasticsearchGroup)) {
      expect(elasticsearchGroup.options).toHaveLength(1);
      const option = elasticsearchGroup.options[0];
      expect(option.id).toBe('elasticsearch.search');
      expect(option.label).toBe('Elasticsearch Search');
      if (isActionOption(option)) {
        expect(option.iconType).toBe('logoElasticsearch');
      }
    }
  });

  it('should add kibana connectors to kibana group', () => {
    const mockConnector = {
      type: 'kibana.saved_object',
      description: 'Kibana Saved Object',
      summary: 'Kibana Summary',
    };

    (getAllConnectors as jest.Mock).mockReturnValue([mockConnector]);
    mockWorkflowsExtensions.getStepDefinition.mockReturnValue(undefined);

    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const kibanaGroup = result.find((group) => group.id === 'kibana');

    expect(kibanaGroup).toBeDefined();
    if (kibanaGroup && isActionGroup(kibanaGroup)) {
      expect(kibanaGroup.options).toHaveLength(1);
      const option = kibanaGroup.options[0];
      expect(option.id).toBe('kibana.saved_object');
      expect(option.label).toBe('Kibana Summary');
      if (isActionOption(option)) {
        expect(option.iconType).toBe('logoKibana');
      }
    }
  });

  it('should add dynamic connectors to external group', () => {
    const mockConnector = {
      type: 'slack.api',
      description: 'Slack API',
      iconType: 'logoSlack',
      instances: [{ id: 'instance1' }, { id: 'instance2' }],
    };

    (getAllConnectors as jest.Mock).mockReturnValue([mockConnector]);
    mockWorkflowsExtensions.getStepDefinition.mockReturnValue(undefined);
    (isDynamicConnector as jest.MockedFunction<typeof isDynamicConnector>).mockImplementation(
      () => true
    );
    (getStepIconType as jest.Mock).mockReturnValue('logoSlack');

    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const externalGroup = result.find((group) => group.id === 'external');

    expect(externalGroup).toBeDefined();
    if (externalGroup && isActionGroup(externalGroup)) {
      expect(externalGroup.options).toHaveLength(1);
      const option = externalGroup.options[0];
      expect(option.id).toBe('slack');
      expect(option.label).toBe('slack');
    }
  });

  it('should create connector groups for dynamic connectors with subtypes', () => {
    const mockConnector = {
      type: 'slack.api',
      description: 'Slack API',
      instances: [{ id: 'instance1' }],
    };

    (getAllConnectors as jest.Mock).mockReturnValue([mockConnector]);
    mockWorkflowsExtensions.getStepDefinition.mockReturnValue(undefined);
    (isDynamicConnector as jest.MockedFunction<typeof isDynamicConnector>).mockImplementation(
      () => true
    );
    (getStepIconType as jest.Mock).mockReturnValue('logoSlack');

    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const externalGroup = result.find((group) => group.id === 'external');

    expect(externalGroup).toBeDefined();
    if (externalGroup && isActionGroup(externalGroup)) {
      // Should create a group for 'slack' base type
      const slackGroup = externalGroup.options.find((opt) => opt.id === 'slack');
      expect(slackGroup).toBeDefined();
      if (slackGroup && isActionGroup(slackGroup)) {
        expect(slackGroup.options).toHaveLength(1);
        expect(slackGroup.options[0].id).toBe('slack.api');
      }
    }
  });

  it('should use default catalog when custom step definition has no catalog', () => {
    const mockConnector = {
      type: 'custom.connector',
      description: 'Custom Connector',
    };

    const mockStepDefinition = {
      id: 'custom.connector',
      label: 'Custom Connector Label',
      description: 'Custom Connector Description',
      icon: 'customIcon',
      inputSchema: z.object({}),
      outputSchema: z.object({}),
    };

    (getAllConnectors as jest.Mock).mockReturnValue([mockConnector]);
    mockWorkflowsExtensions.getStepDefinition.mockReturnValue(mockStepDefinition as any);

    const result = getActionOptions(mockEuiTheme, mockWorkflowsExtensions);
    const kibanaGroup = result.find((group) => group.id === 'kibana');

    expect(kibanaGroup).toBeDefined();
    if (kibanaGroup && isActionGroup(kibanaGroup)) {
      expect(kibanaGroup.options).toHaveLength(1);
    }
  });
});

describe('flattenOptions', () => {
  it('should flatten a simple array of options', () => {
    const options: ActionOptionData[] = [
      { id: 'option1', label: 'Option 1', iconType: 'globe' },
      { id: 'option2', label: 'Option 2', iconType: 'bolt' },
    ];

    const flattened = flattenOptions(options);

    expect(flattened).toHaveLength(2);
    expect(flattened.map((opt) => opt.id)).toEqual(['option1', 'option2']);
  });

  it('should flatten nested options', () => {
    const options: ActionOptionData[] = [
      {
        id: 'group1',
        label: 'Group 1',
        iconType: 'folder',
        options: [
          { id: 'option1', label: 'Option 1', iconType: 'globe' },
          { id: 'option2', label: 'Option 2', iconType: 'bolt' },
        ],
      },
      { id: 'option3', label: 'Option 3', iconType: 'star' },
    ];

    const flattened = flattenOptions(options);

    expect(flattened).toHaveLength(4);
    expect(flattened.map((opt) => opt.id)).toEqual(['group1', 'option1', 'option2', 'option3']);
  });

  it('should flatten deeply nested options', () => {
    const options: ActionOptionData[] = [
      {
        id: 'group1',
        label: 'Group 1',
        iconType: 'folder',
        options: [
          {
            id: 'subgroup1',
            label: 'Subgroup 1',
            iconType: 'folder',
            options: [{ id: 'option1', label: 'Option 1', iconType: 'globe' }],
          },
          { id: 'option2', label: 'Option 2', iconType: 'bolt' },
        ],
      },
    ];

    const flattened = flattenOptions(options);

    expect(flattened).toHaveLength(4);
    expect(flattened.map((opt) => opt.id)).toEqual(['group1', 'subgroup1', 'option1', 'option2']);
  });

  it('should handle empty arrays', () => {
    const flattened = flattenOptions([]);
    expect(flattened).toHaveLength(0);
  });

  it('should handle groups with empty options', () => {
    const options: ActionOptionData[] = [
      {
        id: 'group1',
        label: 'Group 1',
        iconType: 'folder',
        options: [],
      },
    ];

    const flattened = flattenOptions(options);
    expect(flattened).toHaveLength(1);
    expect(flattened[0].id).toBe('group1');
  });
});
