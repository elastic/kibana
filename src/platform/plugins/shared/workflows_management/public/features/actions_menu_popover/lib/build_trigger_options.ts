/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType, UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  DEFAULT_PUBLIC_TRIGGER_ICON,
  mapPublicTriggerToDisplay,
} from '../../../lib/map_public_trigger_to_display';
import { getExtensionStability } from '../../../widgets/workflow_yaml_editor/lib/get_stability_note';
import type { ActionOptionData } from '../types';

interface TriggerNamespaceGroupMetadata {
  label: string;
  description: string;
  iconType: IconType;
}

const TITLE_NAMESPACE_SEPARATOR = ' - ';

export function getTriggerNamespace(triggerId: string): string | undefined {
  const dotIndex = triggerId.indexOf('.');
  if (dotIndex <= 0) {
    return undefined;
  }
  return triggerId.slice(0, dotIndex);
}

function humanizeNamespace(namespace: string): string {
  return namespace
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getTitleNamespacePrefix(title: string): string | undefined {
  const separatorIndex = title.indexOf(TITLE_NAMESPACE_SEPARATOR);
  if (separatorIndex <= 0) {
    return undefined;
  }
  return title.slice(0, separatorIndex);
}

function getTriggerNamespaceGroupMetadata(
  namespace: string,
  triggers: PublicTriggerDefinition[]
): TriggerNamespaceGroupMetadata {
  const titlePrefixes = triggers
    .map((trigger) => getTitleNamespacePrefix(trigger.title ?? trigger.id))
    .filter((prefix): prefix is string => Boolean(prefix));

  const sharedTitlePrefix = titlePrefixes[0];
  const label =
    sharedTitlePrefix !== undefined &&
    titlePrefixes.length === triggers.length &&
    titlePrefixes.every((prefix) => prefix === sharedTitlePrefix)
      ? sharedTitlePrefix
      : humanizeNamespace(namespace);

  const [firstTrigger] = triggers;

  return {
    label,
    description: i18n.translate('workflows.actionsMenu.namespaceTriggersDescription', {
      defaultMessage: 'Run workflows when {namespace} events occur',
      values: { namespace: label },
    }),
    iconType: firstTrigger
      ? mapPublicTriggerToDisplay(firstTrigger).icon
      : DEFAULT_PUBLIC_TRIGGER_ICON,
  };
}

export function buildBuiltInTriggerOptions(euiTheme: UseEuiTheme['euiTheme']): ActionOptionData[] {
  return [
    {
      id: 'manual',
      label: i18n.translate('workflows.actionsMenu.manual', {
        defaultMessage: 'Manual',
      }),
      description: i18n.translate('workflows.actionsMenu.manualDescription', {
        defaultMessage: 'Trigger - Manually start from the UI',
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
        defaultMessage: 'Trigger - When an alert from rule is created',
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
        defaultMessage: 'Trigger - On a schedule (e.g. every 10 minutes)',
      }),
      iconType: 'clock',
      iconColor: euiTheme.colors.textParagraph,
    },
  ];
}

function mapTriggerDefinitionToOption(
  trigger: PublicTriggerDefinition,
  euiTheme: UseEuiTheme['euiTheme']
): ActionOptionData {
  const display = mapPublicTriggerToDisplay(trigger);

  return {
    id: display.id,
    label: display.label,
    description: display.description,
    iconType: display.icon,
    iconColor: euiTheme.colors.vis.euiColorVis6,
    stability: getExtensionStability(trigger),
  };
}

export function buildRegisteredTriggerOptions(
  triggerDefinitions: PublicTriggerDefinition[],
  euiTheme: UseEuiTheme['euiTheme']
): ActionOptionData[] {
  const triggersByNamespace = new Map<string, PublicTriggerDefinition[]>();
  const triggersWithoutNamespace: PublicTriggerDefinition[] = [];

  for (const trigger of triggerDefinitions) {
    const namespace = getTriggerNamespace(trigger.id);
    if (namespace === undefined) {
      triggersWithoutNamespace.push(trigger);
    } else {
      const namespaceTriggers = triggersByNamespace.get(namespace) ?? [];
      namespaceTriggers.push(trigger);
      triggersByNamespace.set(namespace, namespaceTriggers);
    }
  }

  const registeredOptions: ActionOptionData[] = [];

  for (const namespace of [...triggersByNamespace.keys()].sort((a, b) => a.localeCompare(b))) {
    const triggers = [...(triggersByNamespace.get(namespace) ?? [])].sort((a, b) =>
      (a.title ?? a.id).localeCompare(b.title ?? b.id)
    );

    if (triggers.length === 1) {
      const [trigger] = triggers;
      if (trigger) {
        registeredOptions.push(mapTriggerDefinitionToOption(trigger, euiTheme));
      }
    } else {
      const metadata = getTriggerNamespaceGroupMetadata(namespace, triggers);
      registeredOptions.push({
        id: `triggers.${namespace}`,
        label: metadata.label,
        description: metadata.description,
        iconType: metadata.iconType,
        iconColor: euiTheme.colors.vis.euiColorVis6,
        options: triggers.map((trigger) => mapTriggerDefinitionToOption(trigger, euiTheme)),
      });
    }
  }

  const flatTriggersWithoutNamespace = triggersWithoutNamespace
    .sort((a, b) => (a.title ?? a.id).localeCompare(b.title ?? b.id))
    .map((trigger) => mapTriggerDefinitionToOption(trigger, euiTheme));

  return [...registeredOptions, ...flatTriggersWithoutNamespace];
}
