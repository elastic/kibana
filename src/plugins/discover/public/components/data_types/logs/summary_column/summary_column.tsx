/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { AllSummaryColumnProps } from '@kbn/discover-contextual-components';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

const LazySummaryColumn = dynamic(
  () =>
    import(
      '@kbn/discover-contextual-components/src/data_types/logs/components/summary_column/summary_column'
    )
);

export const SummaryColumn = (props: Omit<AllSummaryColumnProps, 'core' | 'share'>) => {
  const { share, core } = useDiscoverServices();
  return <LazySummaryColumn {...props} share={share} core={core} />;
};
