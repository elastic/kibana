/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { NoDataCard } from '../no_data_card';
import { NoDataPageActions } from '../no_data_page';

interface ActionCardProps {
  action: NoDataPageActions;
  key: string;
}

export const ActionCard = (props: ActionCardProps) => {
  const { key, action } = props;
  return (
    <EuiFlexItem key={`empty-page-${key}-action`} className="kbnNoDataPageContents__item">
      <NoDataCard {...action} />
    </EuiFlexItem>
  );
};
