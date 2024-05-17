/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import * as constants from '../../../../../common/data_types/logs/constants';
import { useDiscoverCustomization } from '../../../../customizations';

export const useAdditionalFieldGroups = () => {
  // TODO / NOTE: This will eventually rely on Discover's context resolution to determine which fields
  // are returned based on the data type.
  const isLogsContext = useDiscoverCustomization('field_list')?.logsFieldsEnabled;

  if (isLogsContext) {
    const smartFields = [
      new DataViewField({
        name: constants.RESOURCE_FIELD,
        type: 'smart_field',
        searchable: false,
        aggregatable: false,
      }),
      new DataViewField({
        name: constants.CONTENT_FIELD,
        type: 'smart_field',
        searchable: false,
        aggregatable: false,
      }),
    ];
    return {
      smartFields,
    };
  }
};
