/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import {
  getBaseConnectorType,
  HardcodedIcons,
  resolveIconToDataUrl,
  resolveRegisteredStepIcon,
} from '../../../components/step_icons';

type ActionTypeRegistry = TriggersAndActionsUIPublicPluginStart['actionTypeRegistry'];

export interface GetTypeIconDataUrlParams {
  type: string;
  kind: 'step' | 'trigger';
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
  actionTypeRegistry: ActionTypeRegistry;
}

/**
 * Resolve a workflow step or trigger `type` to a data URL for the inline icon
 * rendered next to the `type:` value in the read-only preview. Resolution
 * mirrors the workflow editor: dynamically-registered icons (workflows
 * extensions + connector action-type registry) take precedence over the static
 * connector-spec and hardcoded fallbacks.
 */
export async function getTypeIconDataUrl({
  type,
  kind,
  workflowsExtensions,
  actionTypeRegistry,
}: GetTypeIconDataUrlParams): Promise<string> {
  if (kind === 'trigger') {
    const hardcoded = HardcodedIcons[type];
    if (hardcoded) {
      return hardcoded;
    }
    const extensionIcon = workflowsExtensions.getTriggerDefinition(type)?.icon;
    return resolveIconToDataUrl(extensionIcon, HardcodedIcons.trigger);
  }

  const baseType = getBaseConnectorType(type);

  const registeredIcon = resolveRegisteredStepIcon(type, {
    workflowsExtensions,
    actionTypeRegistry,
  });
  if (registeredIcon) {
    const resolved = await resolveIconToDataUrl(registeredIcon, '');
    if (resolved) {
      return resolved;
    }
  }

  const hardcoded =
    HardcodedIcons[type] ?? HardcodedIcons[baseType] ?? HardcodedIcons[`.${baseType}`];
  if (hardcoded) {
    return hardcoded;
  }

  return HardcodedIcons.default;
}
