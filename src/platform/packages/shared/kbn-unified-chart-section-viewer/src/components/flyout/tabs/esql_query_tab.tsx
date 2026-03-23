/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { ParsedMetricItem } from '../../../types';
import { TabTitleAndDescription } from '../components';

interface EsqlQueryTabProps {
  esqlQuery?: string;
  metricItem: ParsedMetricItem;
}

export const EsqlQueryTab = ({ esqlQuery, metricItem }: EsqlQueryTabProps) => {
  return (
    <div data-test-subj="metricsExperienceFlyoutEsqlQueryTabContent">
      <TabTitleAndDescription metricItem={metricItem} />
      <EuiCodeBlock
        language="esql"
        fontSize="s"
        paddingSize="s"
        isCopyable
        data-test-subj="metricsExperienceFlyoutEsqlQueryCodeBlock"
      >
        {esqlQuery}
      </EuiCodeBlock>
    </div>
  );
};
