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
import type { MetricField } from '../../types';
import { TabTitleAndDescription } from './tab_title_and_description';

interface EsqlQueryTabProps {
  esqlQuery?: string;
  metric: MetricField;
}

export const EsqlQueryTab = ({ esqlQuery, metric }: EsqlQueryTabProps) => {
  return (
    <>
      <TabTitleAndDescription metric={metric} />
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
        {esqlQuery}
      </EuiCodeBlock>
    </>
  );
};
