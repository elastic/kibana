/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformConnectorTypesResponse } from './transform_connector_types_response';

describe('transformConnectorTypesResponse', () => {
  test('should transform connector types response', () => {
    const result = transformConnectorTypesResponse([
      {
        id: 'actionType1Id',
        name: 'actionType1',
        enabled: true,
        enabled_in_config: true,
        enabled_in_license: true,
        minimum_license_required: 'basic',
        supported_feature_ids: ['stackAlerts'],
        is_system_action_type: true,
      },
      {
        id: 'actionType2Id',
        name: 'actionType2',
        enabled: false,
        enabled_in_config: false,
        enabled_in_license: false,
        minimum_license_required: 'basic',
        supported_feature_ids: ['stackAlerts'],
        is_system_action_type: false,
      },
    ]);

    expect(result).toEqual([
      {
        id: 'actionType1Id',
        name: 'actionType1',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['stackAlerts'],
        isSystemActionType: true,
      },
      {
        id: 'actionType2Id',
        name: 'actionType2',
        enabled: false,
        enabledInConfig: false,
        enabledInLicense: false,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['stackAlerts'],
        isSystemActionType: false,
      },
    ]);
  });
});
