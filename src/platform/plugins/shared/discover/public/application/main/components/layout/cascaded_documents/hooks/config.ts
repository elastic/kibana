/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCurrentTabSelector } from '../../../../state_management/redux';

const SUPPORTED_CASCADE_GROUPING_COUNT = 1;

export const useReadCascadeConfig = () => {
  const cascadeConfig = useCurrentTabSelector((state) => state.uiState.cascadedDocuments);

  if (
    cascadeConfig?.availableCascadeGroups?.length &&
    cascadeConfig?.availableCascadeGroups?.length <= SUPPORTED_CASCADE_GROUPING_COUNT
  ) {
    return cascadeConfig;
  }
};
