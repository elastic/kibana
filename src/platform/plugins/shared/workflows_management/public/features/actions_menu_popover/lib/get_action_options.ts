/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getAllConnectors } from '../../../../common/schema';
import { getStepIconType } from '../../../shared/ui/step_icons/get_step_icon_type';
import type { ActionConnectorGroup, ActionOptionData } from '../types';
import { isActionGroup } from '../types';

export function getActionOptions(euiTheme: UseEuiTheme['euiTheme']): ActionOptionData[] {
  const connectors = getAllConnectors();
  const triggersGroup: ActionOptionData = {
    iconType: 'bolt',
    iconColor: euiTheme.colors.vis.euiColorVis6,
    id: 'triggers',
    label: i18n.translate('workflows.actionsMenu.triggers', {
      defaultMessage: 'Triggers',
    }),
    description: i18n.translate('workflows.actionsMenu.triggersDescription', {
      defaultMessage: 'Choose which event starts a workflow',
    }),
    options: [
      {
        id: 'manual',
        label: i18n.translate('workflows.actionsMenu.manual', {
          defaultMessage: 'Manual',
        }),
        description: i18n.translate('workflows.actionsMenu.manualDescription', {
          defaultMessage: 'Manually start from the UI',
        }),
        iconType: 'play',
        iconColor: 'success',
      },
      {
        id: 'alert',
        label: i18n.translate('workflows.actionsMenu.alert', {
          defaultMessage: 'Alert',
        }),
        description: i18n.translate('workflows.actionsMenu.alertDescription', {
          defaultMessage: 'When an alert from rule is created',
        }),
        iconType: 'bell',
        iconColor: euiTheme.colors.vis.euiColorVis6,
      },
      {
        id: 'scheduled',
        label: i18n.translate('workflows.actionsMenu.schedule', {
          defaultMessage: 'Schedule',
        }),
        description: i18n.translate('workflows.actionsMenu.scheduleDescription', {
          defaultMessage: 'On a schedule (e.g. every 10 minutes)',
        }),
        iconType: 'clock',
        iconColor: euiTheme.colors.textParagraph,
      },
    ],
  };
  const kibanaGroup: ActionOptionData = {
    iconType: 'logoKibana',
    id: 'kibana',
    label: i18n.translate('workflows.actionsMenu.kibana', {
      defaultMessage: 'Kibana',
    }),
    description: i18n.translate('workflows.actionsMenu.kibanaDescription', {
      defaultMessage: 'Work with Kibana data and features directly from your workflow',
    }),
    options: [],
  };
  const httpRequest: ActionOptionData = {
    iconType: 'globe',
    iconColor: euiTheme.colors.vis.euiColorVis0,
    id: 'http',
    label: i18n.translate('workflows.actionsMenu.http', {
      defaultMessage: 'HTTP',
    }),
    description: i18n.translate('workflows.actionsMenu.httpDescription', {
      defaultMessage: 'Make an generic HTTP request',
    }),
  };
  const externalGroup: ActionOptionData = {
    iconType: 'apps',
    iconColor: euiTheme.colors.vis.euiColorVis0,
    id: 'external',
    label: i18n.translate('workflows.actionsMenu.external', {
      defaultMessage: 'External Systems & Apps',
    }),
    description: i18n.translate('workflows.actionsMenu.externalDescription', {
      defaultMessage: 'Automate actions in external systems and apps.',
    }),
    options: [],
  };
  const flowControlGroup: ActionOptionData = {
    iconType: 'branch',
    iconColor: euiTheme.colors.vis.euiColorVis0,
    id: 'flowControl',
    label: i18n.translate('workflows.actionsMenu.aggregations', {
      defaultMessage: 'Flow Control',
    }),
    description: i18n.translate('workflows.actionsMenu.flowControlDescription', {
      defaultMessage: 'Control your workflow with logic, delays, looping, and more',
    }),
    options: [
      {
        id: 'if',
        label: i18n.translate('workflows.actionsMenu.if', {
          defaultMessage: 'If Condition',
        }),
        description: i18n.translate('workflows.actionsMenu.ifDescription', {
          defaultMessage: 'Define condition with KQL to execute the action',
        }),
        iconType: 'branch',
        iconColor: euiTheme.colors.vis.euiColorVis0,
      },
      {
        id: 'foreach',
        label: i18n.translate('workflows.actionsMenu.foreach', {
          defaultMessage: 'Loop (foreach)',
        }),
        description: i18n.translate('workflows.actionsMenu.loopDescription', {
          defaultMessage: 'Iterate the action over a specified list',
        }),
        iconType: 'refresh',
        iconColor: euiTheme.colors.vis.euiColorVis0,
      },
      {
        id: 'wait',
        label: i18n.translate('workflows.actionsMenu.wait', {
          defaultMessage: 'Wait',
        }),
        description: i18n.translate('workflows.actionsMenu.waitDescription', {
          defaultMessage: 'Pause for a specified amount of time before continuing',
        }),
        iconType: 'clock',
        iconColor: euiTheme.colors.vis.euiColorVis0,
      },
    ],
  };
  const elasticSearchGroup: ActionOptionData = {
    iconType: 'logoElasticsearch',
    id: 'elasticsearch',
    label: i18n.translate('workflows.actionsMenu.elasticsearch', {
      defaultMessage: 'Elasticsearch',
    }),
    description: i18n.translate('workflows.actionsMenu.elasticsearchDescription', {
      defaultMessage: 'Work with Elastic data and features directly from your workflow',
    }),
    options: [],
  };

  const baseTypeInstancesCount: Record<string, number> = {};

  for (const connector of connectors) {
    if (connector.type.startsWith('elasticsearch.')) {
      elasticSearchGroup.options.push({
        id: connector.type,
        label: connector.description || connector.type,
        description: connector.type,
        iconType: 'logoElasticsearch',
      });
    } else if (connector.type.startsWith('kibana.')) {
      kibanaGroup.options.push({
        id: connector.type,
        label: connector.summary || connector.description || connector.type,
        description: connector.type,
        iconType: 'logoKibana',
      });
    } else {
      const [baseType, subtype] = connector.type.split('.');
      let groupOption = externalGroup;
      if (subtype) {
        let connectorGroup = externalGroup.options.find((option) => option.id === baseType);
        // create a group for the basetype if not yet exists
        if (!connectorGroup) {
          baseTypeInstancesCount[baseType] = 0;
          const newConnectorGroup: ActionConnectorGroup = {
            id: baseType,
            label: baseType,
            connectorType: baseType,
            options: [],
          };
          connectorGroup = newConnectorGroup;
          externalGroup.options.push(newConnectorGroup);
        }
        // We know connectorGroup is an ActionGroup because we either found it in options
        // (which are ActionOptionData[]) or we just created it with the options property
        if (isActionGroup(connectorGroup)) {
          groupOption = connectorGroup;
        }
      }
      const iconType = getStepIconType(connector.type);
      baseTypeInstancesCount[baseType] += connector.instances?.length || 0;
      groupOption.instancesLabel = getInstancesLabel(baseTypeInstancesCount[baseType]);

      // groupOption is always an ActionGroup here (either externalGroup or a validated connectorGroup)
      if (isActionGroup(groupOption)) {
        groupOption.options.push({
          id: connector.type,
          label: connector.description || connector.type,
          description: connector.type,
          connectorType: connector.type,
          instancesLabel: getInstancesLabel(connector.instances?.length),
          iconType,
        });
      }
    }
  }

  return [
    triggersGroup,
    elasticSearchGroup,
    kibanaGroup,
    externalGroup,
    httpRequest,
    flowControlGroup,
  ];
}

export function flattenOptions(options: ActionOptionData[]): ActionOptionData[] {
  return options
    .map((option) => [option, ...flattenOptions(isActionGroup(option) ? option.options : [])])
    .flat();
}

function getInstancesLabel(instancesCount: number | undefined): string | undefined {
  if (!instancesCount) {
    return undefined;
  }
  if (instancesCount === 0) {
    return i18n.translate('workflows.actionsMenu.noInstances', {
      defaultMessage: 'Not connected',
    });
  }
  if (instancesCount === 1) {
    return i18n.translate('workflows.actionsMenu.oneInstance', {
      defaultMessage: '1 connected',
    });
  }
  return i18n.translate('workflows.actionsMenu.multipleInstances', {
    defaultMessage: '{count} connected',
    values: { count: instancesCount },
  });
}
