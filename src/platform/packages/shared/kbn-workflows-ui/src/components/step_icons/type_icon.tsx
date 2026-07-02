/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps, IconType } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import React, { Suspense, useMemo } from 'react';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import { getBaseConnectorType } from './get_base_connector_type';
import { getConnectorSpecIcon } from './get_connector_spec_icon';
import { getStepIconType } from './get_step_icon_type';
import { useWorkflowsUiServices } from '../../context';

type ActionTypeRegistry = TriggersAndActionsUIPublicPluginStart['actionTypeRegistry'];

/** Bare trigger `type` values (e.g. `manual`, `alert`, `scheduled`) mapped to an EUI icon. */
const TRIGGER_TYPE_ICONS: Record<string, IconType> = {
  manual: 'play',
  alert: 'warning',
  scheduled: 'clock',
};

const DEFAULT_TRIGGER_ICON: IconType = 'bolt';

// stepType is in the format of `actionTypeId.subAction` (optionally leading `.`).
function getActionTypeIcon(
  stepType: string,
  actionTypeRegistry: ActionTypeRegistry
): IconType | undefined {
  const action = stepType.startsWith('.') ? stepType.slice(1) : stepType;
  const [actionTypeId] = action.split('.');
  const id = `.${actionTypeId}`;
  return actionTypeRegistry.has(id) ? actionTypeRegistry.get(id).iconClass : undefined;
}

// Catalog step icons aggregate by base type; extension steps register full ids
// (e.g. `cases.createCase`). Fall back to the first registered step in the family
// that declares an icon so the aggregated icon inherits the extension's choice.
function findStepDefinitionIconByBaseType(
  stepType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): IconType | undefined {
  const prefix = `${getBaseConnectorType(stepType)}.`;
  const family = workflowsExtensions
    .getAllStepDefinitions()
    .filter((def) => def.id.startsWith(prefix));
  return (family.find((def) => def.icon) ?? family[0])?.icon;
}

function resolveTriggerIconType(
  triggerType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): IconType {
  return (
    TRIGGER_TYPE_ICONS[triggerType] ??
    workflowsExtensions.getTriggerDefinition(triggerType)?.icon ??
    DEFAULT_TRIGGER_ICON
  );
}

function resolveStepIconType(
  stepType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart,
  actionTypeRegistry: ActionTypeRegistry
): IconType {
  // Same precedence as the plugin's StepIcon: extension registry → connector
  // spec (static) → action-type registry → static base-type map.
  const extensionIcon =
    workflowsExtensions.getStepDefinition(stepType)?.icon ??
    findStepDefinitionIconByBaseType(stepType, workflowsExtensions);
  if (extensionIcon) {
    return extensionIcon;
  }

  const connectorSpecIcon = getConnectorSpecIcon(stepType);
  if (connectorSpecIcon) {
    return connectorSpecIcon;
  }

  const actionTypeIcon = getActionTypeIcon(stepType, actionTypeRegistry);
  if (actionTypeIcon) {
    return actionTypeIcon;
  }

  return getStepIconType(getBaseConnectorType(stepType));
}

export interface TypeIconProps extends Omit<EuiIconProps, 'type'> {
  /** The catalog `stepTypes[n]` or `triggerTypes[n]` value (e.g. `abuseipdb.checkIp`, `manual`). */
  type: string;
  kind: 'step' | 'trigger';
}

/**
 * Renders an icon for a workflow step or trigger `type` string. Resolution
 * mirrors the plugin's `StepIcon`: dynamically-registered icons (workflows
 * extensions + connector action-type registry) take precedence over the static
 * connector-spec and hardcoded fallbacks, so connectors like `http` that only
 * exist in the action-type registry still render their real icon. The registries
 * come from {@link useWorkflowsUiServices}, so consumers must be wrapped in a
 * `WorkflowsUiServicesProvider`. The tooltip shows the raw `type`.
 */
export const TypeIcon = React.memo<TypeIconProps>(({ type, kind, title, ...rest }) => {
  const { workflowsExtensions, triggersActionsUi } = useWorkflowsUiServices();

  const iconType = useMemo(
    () =>
      kind === 'trigger'
        ? resolveTriggerIconType(type, workflowsExtensions)
        : resolveStepIconType(type, workflowsExtensions, triggersActionsUi.actionTypeRegistry),
    [kind, type, workflowsExtensions, triggersActionsUi]
  );

  const label = title ?? type;

  const icon =
    typeof iconType === 'string' ? (
      <EuiIcon type={iconType} size="m" {...rest} />
    ) : (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <EuiIcon type={iconType} size="m" {...rest} />
      </Suspense>
    );

  return <EuiToolTip content={label}>{icon}</EuiToolTip>;
});
TypeIcon.displayName = 'TypeIcon';
