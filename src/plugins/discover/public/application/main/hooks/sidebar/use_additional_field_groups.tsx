/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { useMemo } from 'react';
import { useDiscoverCustomization } from '../../../../customizations';

export const useAdditionalFieldGroups = () => {
  // TODO / NOTE: This will eventually rely on Discover's context resolution to determine which fields
  // are returned based on the data type.
  const isLogsContext = useDiscoverCustomization('field_list')?.logsFieldsEnabled;

  const fields = useMemo(() => {
    if (isLogsContext) {
      const smartFields: DataViewField[] = [
        /**
         * We are switching from these virtual columns to the One Discover Summary column.
         * In this effort we don't want to immediately cleanup everything about these virtual columns,
         * but only disable their instantiation.
         * We'll clean this part as soon as we decide to definitevely discard these columns.
         **/
        // new DataViewField({
        //   name: constants.RESOURCE_FIELD,
        //   type: 'smart_field',
        //   searchable: false,
        //   aggregatable: false,
        // }),
        // new DataViewField({
        //   name: constants.CONTENT_FIELD,
        //   type: 'smart_field',
        //   searchable: false,
        //   aggregatable: false,
        // }),
      ];
      // For functionality that cannot support smart fields, we need to provide fallback fields.
      const fallbackFields = {
        /**
         * We are switching from these virtual columns to the One Discover Summary column.
         * In this effort we don't want to immediately cleanup everything about these virtual columns,
         * but only disable their instantiation.
         * We'll clean this part as soon as we decide to definitevely discard these columns.
         **/
        // [constants.RESOURCE_FIELD]: constants.RESOURCE_FIELD_CONFIGURATION.fallbackFields,
        // [constants.CONTENT_FIELD]: constants.CONTENT_FIELD_CONFIGURATION.fallbackFields,
      };
      return {
        smartFields,
        fallbackFields,
      };
    }
  }, [isLogsContext]);

  return fields;
};
