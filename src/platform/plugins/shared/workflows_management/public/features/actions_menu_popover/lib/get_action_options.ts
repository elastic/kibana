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
import { getBuiltInStepDefinition, isDynamicConnector, StepCategory } from '@kbn/workflows';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import { ParallelIcon } from '@kbn/workflows-ui';
import { buildBuiltInTriggerOptions, buildRegisteredTriggerOptions } from './build_trigger_options';
import { getAllConnectors, isDeprecatedStepType } from '../../../../common/schema';
import { triggerSchemas } from '../../../trigger_schemas';
import type { ActionConnectorGroup, ActionGroup, ActionOptionData, IconVariant } from '../types';
import { isActionGroup } from '../types';

/** Case-insensitive A–Z compare for subcategory menus. */
export function compareActionLabels(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

/**
 * Human-readable label for an External connector family group.
 * Prefers "FamilyName" from descriptions shaped like "FamilyName - SubAction".
 */
function getExternalConnectorGroupLabel(
  baseType: string,
  connector: { description?: string | null }
): string {
  const description = connector.description?.trim();
  if (description) {
    const separatorIndex = description.indexOf(' - ');
    if (separatorIndex > 0) {
      return description.slice(0, separatorIndex).trim();
    }
  }
  return baseType
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function stripHtml(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const noTags = text.replace(/<[^>]*>/g, ' ');
  const decoded = noTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const noMarkdown = decoded
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
  return noMarkdown.replace(/\s+/g, ' ').trim() || undefined;
}

function firstSentence(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const dot = text.indexOf('. ');
  return dot !== -1 && dot < 180 ? text.slice(0, dot + 1) : text.slice(0, 180);
}

function getBuiltInNestedFlowControlStepOptions(
  euiTheme: UseEuiTheme['euiTheme']
): ActionOptionData[] {
  return (['waitForApproval', 'workflow.execute', 'workflow.executeAsync'] as const)
    .map((stepId) => getBuiltInStepDefinition(stepId))
    .filter((def): def is NonNullable<typeof def> => def !== undefined)
    .map((def) => ({
      id: def.id,
      label: def.label,
      description: def.description,
      iconType: 'nested' as const,
      iconColor: euiTheme.colors.vis.euiColorVis0,
      stability: def.stability,
    }));
}

function mergeNestedStepGroups(stepGroups: Record<StepCategory, ActionGroup>): void {
  for (const group of Object.values(stepGroups)) {
    if (group.nestedGroups) {
      for (const nestedGroup of group.nestedGroups) {
        if (nestedGroup.options.length > 0) {
          group.options.unshift(nestedGroup);
        }
      }
    }
  }
}

export function getActionOptions(
  euiTheme: UseEuiTheme['euiTheme'],
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): ActionOptionData[] {
  const connectors = getAllConnectors();
  const builtInTriggerOptions = buildBuiltInTriggerOptions(euiTheme);
  const registeredTriggerOptions = buildRegisteredTriggerOptions(
    triggerSchemas.getTriggerDefinitions(),
    euiTheme
  );
  const triggersGroup: ActionOptionData = {
    iconType: 'bolt',
    iconColor: euiTheme.colors.textInverse,
    id: 'triggers',
    label: i18n.translate('workflows.actionsMenu.triggers', {
      defaultMessage: 'Triggers',
    }),
    description: i18n.translate('workflows.actionsMenu.triggersDescription', {
      defaultMessage: 'Choose which event starts a workflow.',
    }),
    options: [...builtInTriggerOptions, ...registeredTriggerOptions],
  };

  const kibanaCasesGroup: ActionGroup = {
    iconType: 'briefcase',
    iconColor: euiTheme.colors.textParagraph,
    id: 'kibana.cases',
    label: i18n.translate('workflows.actionsMenu.kibanaCases', {
      defaultMessage: 'Cases',
    }),
    description: i18n.translate('workflows.actionsMenu.kibanaCasesDescription', {
      defaultMessage: 'Create and manage cases from your workflow',
    }),
    options: [],
  };

  const kibanaEntityStoreGroup: ActionGroup = {
    iconType: 'securityApp',
    id: 'kibana.entityStore',
    label: i18n.translate('workflows.actionsMenu.kibanaEntityStore', {
      defaultMessage: 'Entity Store',
    }),
    description: i18n.translate('workflows.actionsMenu.kibanaEntityStoreDescription', {
      defaultMessage: 'Work with Entity Store data and features directly from your workflow',
    }),
    options: [],
  };

  const kibanaSecurityGroup: ActionGroup = {
    iconType: 'securityApp',
    id: 'kibana.security',
    label: i18n.translate('workflows.actionsMenu.kibanaSecurity', {
      defaultMessage: 'Security',
    }),
    description: i18n.translate('workflows.actionsMenu.kibanaSecurityDescription', {
      defaultMessage: 'Work with Security data and features directly from your workflow',
    }),
    options: [],
  };

  const kibanaGroup: ActionGroup = {
    iconType: 'logoKibana',
    id: 'kibana',
    label: i18n.translate('workflows.actionsMenu.kibana', {
      defaultMessage: 'Kibana',
    }),
    description: i18n.translate('workflows.actionsMenu.kibanaDescription', {
      defaultMessage: 'Work with Kibana data and features directly from your workflow',
    }),
    options: [],
    nestedGroups: [kibanaCasesGroup, kibanaEntityStoreGroup, kibanaSecurityGroup],
  };
  const externalGroup: ActionOptionData = {
    iconType: 'plugs',
    iconColor: euiTheme.colors.textParagraph,
    id: 'external',
    label: i18n.translate('workflows.actionsMenu.external', {
      defaultMessage: 'External systems & apps',
    }),
    description: i18n.translate('workflows.actionsMenu.externalDescription', {
      defaultMessage: 'Automate actions in external systems and apps.',
    }),
    options: [],
  };
  const aiGroup: ActionOptionData = {
    iconType: 'sparkles',
    iconColor: euiTheme.colors.textInverse,
    id: 'ai',
    label: i18n.translate('workflows.actionsMenu.ai', {
      defaultMessage: 'AI',
    }),
    description: i18n.translate('workflows.actionsMenu.aiDescription', {
      defaultMessage: 'Use AI to automate your workflows and get insights into your data',
    }),
    options: [],
  };
  const dataTransformationGroup: ActionOptionData = {
    iconType: 'database',
    iconColor: euiTheme.colors.textInverse,
    id: 'data',
    label: i18n.translate('workflows.actionsMenu.dataTransformation', {
      defaultMessage: 'Data transformation',
    }),
    description: i18n.translate('workflows.actionsMenu.dataTransformationDescription', {
      defaultMessage: 'Manipulate and convert your data',
    }),
    options: [
      {
        id: 'data.set',
        label: i18n.translate('workflows.actionsMenu.dataSet', {
          defaultMessage: 'Set Variables',
        }),
        description: i18n.translate('workflows.actionsMenu.dataSetDescription', {
          defaultMessage: 'Define or compute variables to use in your workflow',
        }),
        iconType: 'database',
        iconColor: euiTheme.colors.textInverse,
      },
    ],
  };
  const flowControlGroup: ActionOptionData = {
    iconType: 'branch',
    iconColor: euiTheme.colors.textInverse,
    id: 'flowControl',
    label: i18n.translate('workflows.actionsMenu.aggregations', {
      defaultMessage: 'Flow control',
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
        iconColor: euiTheme.colors.textInverse,
      },
      {
        id: 'switch',
        label: i18n.translate('workflows.actionsMenu.switch', {
          defaultMessage: 'Switch',
        }),
        description: i18n.translate('workflows.actionsMenu.switchDescription', {
          defaultMessage: 'Multi-way branching based on expression value matching',
        }),
        iconType: 'productStreamsWired',
        iconColor: euiTheme.colors.textInverse,
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
        iconColor: euiTheme.colors.textInverse,
      },
      {
        id: 'while',
        label: i18n.translate('workflows.actionsMenu.while', {
          defaultMessage: 'While Loop',
        }),
        description: i18n.translate('workflows.actionsMenu.whileDescription', {
          defaultMessage: 'Repeat steps while a condition is true',
        }),
        iconType: 'refresh',
        iconColor: euiTheme.colors.textInverse,
      },
      {
        id: 'parallel',
        label: i18n.translate('workflows.actionsMenu.parallel', {
          defaultMessage: 'Parallel',
        }),
        description: i18n.translate('workflows.actionsMenu.parallelDescription', {
          defaultMessage: 'Run branches concurrently and collect their results',
        }),
        iconType: ParallelIcon,
        iconColor: euiTheme.colors.vis.euiColorVis0,
        stability: getBuiltInStepDefinition('parallel')?.stability,
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
        iconColor: euiTheme.colors.textInverse,
      },
      {
        id: 'waitForInput',
        label: i18n.translate('workflows.actionsMenu.waitForInput', {
          defaultMessage: 'Wait For Input',
        }),
        description: i18n.translate('workflows.actionsMenu.waitForInputDescription', {
          defaultMessage: 'Pause execution until external input is provided (human-in-the-loop)',
        }),
        iconType: 'user',
        iconColor: euiTheme.colors.textInverse,
        stability: getBuiltInStepDefinition('waitForInput')?.stability,
      },
      ...getBuiltInNestedFlowControlStepOptions(euiTheme),
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

  const stepGroups: Record<StepCategory, ActionGroup> = {
    [StepCategory.Elasticsearch]: elasticSearchGroup,
    [StepCategory.External]: externalGroup,
    [StepCategory.Ai]: aiGroup,
    [StepCategory.Kibana]: kibanaGroup,
    [StepCategory.KibanaCases]: kibanaCasesGroup,
    [StepCategory.KibanaEntityStore]: kibanaEntityStoreGroup,
    [StepCategory.KibanaSecurity]: kibanaSecurityGroup,
    [StepCategory.Data]: dataTransformationGroup,
    [StepCategory.FlowControl]: flowControlGroup,
  };

  const baseTypeInstancesCount: Record<string, number> = {};

  for (const connector of connectors) {
    if (!isDeprecatedStepType(connector.type)) {
      const customStepDefinition = workflowsExtensions.getStepDefinition(connector.type);
      if (customStepDefinition) {
        const group = stepGroups[customStepDefinition.category];
        group.options.push({
          id: customStepDefinition.id,
          label: customStepDefinition.label,
          description: customStepDefinition.description,
          iconType: customStepDefinition.icon ?? group.iconType,
          stability: connector.stability,
        });
      } else if (connector.type.startsWith('elasticsearch.')) {
        elasticSearchGroup.options.push({
          id: connector.type,
          label: connector.summary || connector.description || connector.type,
          description: firstSentence(stripHtml(connector.description)) || connector.type,
          iconType: 'logoElasticsearch',
          stability: connector.stability,
        });
      } else if (connector.type.startsWith('kibana.')) {
        kibanaGroup.options.push({
          id: connector.type,
          label: connector.summary || connector.description || connector.type,
          description: firstSentence(stripHtml(connector.description)) || connector.type,
          iconType: 'logoKibana',
          stability: connector.stability,
        });
      } else if (isDynamicConnector(connector)) {
        const baseType = connector.actionTypeId.replace(/^\./, '');
        const hasSubAction = connector.type.startsWith(`${baseType}.`);
        let groupOption = externalGroup;
        if (hasSubAction) {
          let connectorGroup = externalGroup.options.find((option) => option.id === baseType);
          // create a group for the basetype if not yet exists
          if (!connectorGroup) {
            baseTypeInstancesCount[baseType] = 0;
            const newConnectorGroup: ActionConnectorGroup = {
              id: baseType,
              label: connector.displayName,
              description: connector.actionTypeId.replace(/^\./, ''),
              connectorType: connector.actionTypeId,
              options: [],
            };
            connectorGroup = newConnectorGroup;
            externalGroup.options.push(newConnectorGroup);
          } else if (connectorGroup.label === baseType) {
            // Upgrade raw id labels once we have a friendlier family name
            connectorGroup.label = getExternalConnectorGroupLabel(baseType, connector);
          }
          // We know connectorGroup is an ActionGroup because we either found it in options
          // (which are ActionOptionData[]) or we just created it with the options property
          if (isActionGroup(connectorGroup)) {
            groupOption = connectorGroup;
          }
        }
        baseTypeInstancesCount[baseType] += connector.instances?.length || 0;
        groupOption.instancesLabel = getInstancesLabel(baseTypeInstancesCount[baseType]);

        // groupOption is always an ActionGroup here (either externalGroup or a validated connectorGroup)
        if (isActionGroup(groupOption)) {
          groupOption.options.push({
            id: connector.type,
            label: connector.summary || connector.displayName,
            description: connector.type,
            connectorType: connector.actionTypeId,
            instancesLabel: getInstancesLabel(connector.instances?.length),
            stability: connector.stability,
          });
        }
      }
    }
  }

  mergeNestedStepGroups(stepGroups);

  triggersGroup.iconVariant = 'trigger';
  // App logos use neutral containers so brand colors stay readable
  elasticSearchGroup.iconVariant = 'neutral';
  kibanaGroup.iconVariant = 'neutral';
  // Cases uses a briefcase glyph — same neutral tile as Kibana / ES / External
  kibanaCasesGroup.iconVariant = 'neutral';
  aiGroup.iconVariant = 'platform';
  dataTransformationGroup.iconVariant = 'dataTransformation';
  externalGroup.iconVariant = 'external';
  flowControlGroup.iconVariant = 'flowControl';

  // AI category always uses the sparkles glyph on the platform tile
  for (const opt of isActionGroup(aiGroup) ? aiGroup.options : []) {
    if ('iconType' in opt) {
      opt.iconType = 'sparkles';
    }
  }

  // Color-grouped: accent (triggers) → neutral tiles → platform blues → flow control
  const topLevelOptions: ActionOptionData[] = [
    triggersGroup,
    elasticSearchGroup,
    kibanaGroup,
    externalGroup,
    aiGroup,
    dataTransformationGroup,
    flowControlGroup,
  ];
  // Subcategory lists (and nested groups within them) are A–Z by label.
  // Root categories keep the intentional color-grouped order above.
  // Triggers keep built-ins first (manual/alert/scheduled), then registered groups.
  for (const group of topLevelOptions) {
    if (!('options' in group)) {
      // no-op for type narrowing
    } else if (group.id === 'triggers') {
      for (const opt of group.options) {
        if ('options' in opt) {
          sortOptionsByLabel(opt.options);
        }
      }
    } else {
      sortOptionsByLabel(group.options);
    }
  }
  assignActionPathIds(topLevelOptions);
  assignIconVariants(topLevelOptions, undefined, euiTheme);
  return topLevelOptions;
}

/** Sort a group's children alphabetically; recurses into nested groups. */
function sortOptionsByLabel(options: ActionOptionData[]): void {
  options.sort((a, b) => compareActionLabels(a.label, b.label));
  for (const opt of options) {
    if ('options' in opt) {
      sortOptionsByLabel(opt.options);
    }
  }
}

/** Filled tile variants (pink / blue / teal / warning) always use inverse glyphs for contrast. */
export function usesInverseIconColor(variant: IconVariant | undefined): boolean {
  return (
    variant === 'platform' ||
    variant === 'trigger' ||
    variant === 'flowControl' ||
    variant === 'dataTransformation'
  );
}

function assignIconVariants(
  options: ActionOptionData[],
  parentVariant: IconVariant | undefined,
  euiTheme: UseEuiTheme['euiTheme']
): void {
  for (const opt of options) {
    if (parentVariant && !opt.iconVariant) {
      opt.iconVariant = parentVariant;
    }
    const childVariant = opt.iconVariant ?? parentVariant;
    if (usesInverseIconColor(childVariant)) {
      opt.iconColor = euiTheme.colors.textInverse;
    }
    if ('options' in opt && childVariant) {
      assignIconVariants(
        (opt as ActionGroup | ActionConnectorGroup).options,
        childVariant,
        euiTheme
      );
    }
  }
}

/**
 * Sets `pathIds` on every item (groups and leaves) so search can group by root category
 * and navigation works when selecting from search results.
 */
function assignActionPathIds(
  options: ActionOptionData[],
  parentPath: readonly string[] = []
): void {
  for (const opt of options) {
    opt.pathIds = [...parentPath, opt.id];
    if ('options' in opt) {
      assignActionPathIds(opt.options, opt.pathIds);
    }
  }
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
