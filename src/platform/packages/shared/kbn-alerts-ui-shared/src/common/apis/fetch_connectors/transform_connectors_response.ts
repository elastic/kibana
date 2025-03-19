/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AsApiContract, RewriteRequestCase } from '@kbn/actions-types';
import { ActionConnectorProps } from '../../types';

export const transformConnectorResponse = (
  results: Array<
    AsApiContract<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>>
  >
): Array<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>> => {
  return results.map((item) => transformConnector(item));
};

const transformConnector: RewriteRequestCase<
  ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>
> = ({
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  referenced_by_count: referencedByCount,
  is_missing_secrets: isMissingSecrets,
  is_system_action: isSystemAction,
  ...res
}) => ({
  actionTypeId,
  isPreconfigured,
  isDeprecated,
  referencedByCount,
  isMissingSecrets,
  isSystemAction,
  ...res,
});
