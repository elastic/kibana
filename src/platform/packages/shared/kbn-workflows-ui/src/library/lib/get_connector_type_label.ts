/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { getBaseConnectorType } from '../../components/step_icons/get_base_connector_type';

/**
 * Display name for an install-form field's `connectorType` (e.g. `.slack` →
 * `Slack`). Reads the action-type registry the same way the step icons do, and
 * falls back to the capitalized base type when the connector's plugin is not
 * registered in this host (`actionTypeTitle` is optional on `ActionTypeModel`).
 */
export function getConnectorTypeLabel(
  connectorType: string,
  actionTypeRegistry: TypeRegistry<ActionTypeModel>
): string {
  const id = connectorType.startsWith('.') ? connectorType : `.${connectorType}`;
  const model = actionTypeRegistry.has(id) ? actionTypeRegistry.get(id) : undefined;
  return (
    model?.actionTypeTitle ??
    model?.selectMessage ??
    capitalize(getBaseConnectorType(connectorType))
  );
}

const capitalize = (value: string): string =>
  value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
