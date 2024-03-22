/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiLoadingChart } from '@elastic/eui';
import styled from '@emotion/styled';
import { TEST_IDS } from './constants';

const FilterGroupLoadingButton = styled(EuiButton)`
  height: 34px;
`;

export const FilterGroupLoading = () => {
  return (
    <FilterGroupLoadingButton color="text">
      <EuiLoadingChart className="filter-group__loading" data-test-subj={TEST_IDS.FILTER_LOADING} />
    </FilterGroupLoadingButton>
  );
};
