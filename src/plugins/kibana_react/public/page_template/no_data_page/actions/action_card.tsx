/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { ReactElement } from 'react';
import { ElasticAgentCard, NoDataCard } from '../no_data_card';

interface ActionCardProps {
  key: string;
  child: ReactElement<typeof NoDataCard> | ReactElement<typeof ElasticAgentCard>;
}

export const ActionCard = (props: ActionCardProps) => {
  const { key, child } = props;
  return (
    <EuiFlexItem key={key} className="kbnNoDataPageContents__item">
      {child}
    </EuiFlexItem>
  );
};
