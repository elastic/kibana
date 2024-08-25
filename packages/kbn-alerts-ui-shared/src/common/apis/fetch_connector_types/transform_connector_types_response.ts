/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AsApiContract, RewriteRequestCase, ActionType } from '@kbn/actions-types';

const transformConnectorType: RewriteRequestCase<ActionType> = ({
  enabled_in_config: enabledInConfig,
  enabled_in_license: enabledInLicense,
  minimum_license_required: minimumLicenseRequired,
  supported_feature_ids: supportedFeatureIds,
  is_system_action_type: isSystemActionType,
  ...res
}: AsApiContract<ActionType>) => ({
  enabledInConfig,
  enabledInLicense,
  minimumLicenseRequired,
  supportedFeatureIds,
  isSystemActionType,
  ...res,
});

export const transformConnectorTypesResponse = (
  results: Array<AsApiContract<ActionType>>
): ActionType[] => {
  return results.map((item) => transformConnectorType(item));
};
