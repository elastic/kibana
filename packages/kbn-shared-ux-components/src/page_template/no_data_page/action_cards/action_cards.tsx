/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import React, { ReactElement } from 'react';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { ElasticAgentCard, NoDataCard } from '../no_data_card';
import { ActionCardsStyles } from './action_cards.styles';

interface ActionCardsProps {
  actionCards: Array<ReactElement<typeof NoDataCard> | ReactElement<typeof ElasticAgentCard>>;
}
export const ActionCards = ({ actionCards }: ActionCardsProps) => {
  const isWithinBreakpoints = useIsWithinBreakpoints(['xs', 's']);
  const euiSize = 16;
  const actionCardsStyle = ActionCardsStyles(euiSize, isWithinBreakpoints);

  const cards = actionCards.map((card) => (
    <EuiFlexItem key={card.key || ''} css={actionCardsStyle}>
      {card}
    </EuiFlexItem>
  ));
  return (
    <EuiFlexGrid columns={2} style={{ justifyContent: 'space-around' }}>
      {cards}
    </EuiFlexGrid>
  );
};
