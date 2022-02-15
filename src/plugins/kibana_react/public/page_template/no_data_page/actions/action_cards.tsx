/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGrid } from '@elastic/eui';
import React, { ReactElement } from 'react';
import { ActionCard } from './action_card';

interface ActionCardsProps {
  actionCards: Array<ReactElement<typeof ActionCard>>;
}
export const ActionCards = (props: ActionCardsProps) => {
  const { actionCards } = props;
  return (
    <EuiFlexGrid columns={2} style={{ justifyContent: 'space-around' }}>
      {actionCards}
    </EuiFlexGrid>
  );
};
