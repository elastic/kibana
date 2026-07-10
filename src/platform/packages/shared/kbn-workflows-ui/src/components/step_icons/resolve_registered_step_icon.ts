/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import type { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type {
  PublicStepDefinition,
  WorkflowsExtensionsPublicPluginStart,
} from '@kbn/workflows-extensions/public';
import { getBaseConnectorType } from './get_base_connector_type';
import { getConnectorSpecIcon } from './get_connector_spec_icon';

export interface ResolveRegisteredStepIconDeps {
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
}

/**
 * Resolves a step icon from the dynamically-registered sources shared by the
 * plugin's `StepIcon` (workflow graphs/lists) and this package's `TypeIcon`
 * (catalog cards): a workflows-extensions step definition (or its base-type
 * family), the static connector-spec map, then the action-type registry.
 * Returns `undefined` when none of those have an icon, callers fall back to
 * the static `getStepIconType(getBaseConnectorType(stepType))` map.
 */
export function resolveRegisteredStepIcon(
  stepType: string,
  { workflowsExtensions, actionTypeRegistry }: ResolveRegisteredStepIconDeps
): IconType | undefined {
  const stepDefinition =
    workflowsExtensions.getStepDefinition(stepType) ??
    findStepDefinitionByBaseType(stepType, workflowsExtensions);
  if (stepDefinition?.icon) {
    return stepDefinition.icon;
  }

  const connectorSpecIcon = getConnectorSpecIcon(stepType);
  if (connectorSpecIcon) {
    return connectorSpecIcon;
  }

  return getActionTypeIcon(stepType, actionTypeRegistry);
}

// stepType is in the format of `actionTypeId.subAction` (optionally leading `.`).
function getActionTypeIcon(
  stepType: string,
  actionTypeRegistry: TypeRegistry<ActionTypeModel>
): IconType | undefined {
  const action = stepType.startsWith('.') ? stepType.slice(1) : stepType;
  const [actionTypeId] = action.split('.');
  const id = `.${actionTypeId}`;
  return actionTypeRegistry.has(id) ? actionTypeRegistry.get(id).iconClass : undefined;
}

// List rows aggregate by base type (e.g. `cases` from `cases.createCase`), but extension steps
// register full ids (e.g. `cases.createCase`). Fall back to the first registered step whose id
// starts with `${baseType}.` so the list inherits the extension icon chosen for that family.
// Prefer a sibling that has an icon — some family members (e.g. `ai.agent`) intentionally omit
// one, and returning those here would drop the family back to the plugs fallback.
function findStepDefinitionByBaseType(
  stepType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): PublicStepDefinition | undefined {
  const prefix = `${getBaseConnectorType(stepType)}.`;
  const family = workflowsExtensions
    .getAllStepDefinitions()
    .filter((def) => def.id.startsWith(prefix));
  return family.find((def) => def.icon) ?? family[0];
}
