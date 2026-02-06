/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-types';
import type { ActionConnectorProps, ActionConnector } from '../../types';
import { BASE_ACTION_API_PATH } from '../../constants';

export async function fetchConnector(
  id: string,
  { http }: { http: HttpSetup }
): Promise<ActionConnector> {
  const path = `${BASE_ACTION_API_PATH}/connector/${id}`;

  const res = await http.get<Parameters<typeof transformConnectorResponse>[0]>(path);
  return transformConnectorResponse(res) as ActionConnector;
}

export const transformConnectorResponse = (
  result: AsApiContract<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>>
): ActionConnectorProps<Record<string, unknown>, Record<string, unknown>> => {
  const {
    connector_type_id: actionTypeId,
    is_preconfigured: isPreconfigured,
    is_deprecated: isDeprecated,
    referenced_by_count: referencedByCount,
    is_missing_secrets: isMissingSecrets,
    is_system_action: isSystemAction,
    is_connector_type_deprecated: isConnectorTypeDeprecated,
    ...res
  } = result;
  return {
    actionTypeId,
    isPreconfigured,
    isDeprecated,
    referencedByCount,
    isMissingSecrets,
    isSystemAction,
    isConnectorTypeDeprecated,
    ...res,
  };
};
