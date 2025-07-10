/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  mathWithUnits,
  useEuiTheme,
  useEuiMaxBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { ReactElement } from 'react';
import { ElasticAgentCard, NoDataCard } from '../no_data_card';

interface ActionCardsProps {
  actionCards: Array<ReactElement<typeof NoDataCard> | ReactElement<typeof ElasticAgentCard>>;
}
export const ActionCards = ({ actionCards }: ActionCardsProps) => {
  const { euiTheme } = useEuiTheme();
  const cards = actionCards.map((card) => (
    <EuiFlexItem key={card.key || ''} className="kbnNoDataPageContents__item">
      {card}
    </EuiFlexItem>
  ));
  return (
    <EuiFlexGrid
      columns={2}
      css={css({
        justifyContent: 'space-around',
        '.kbnNoDataPageContents__item:only-child': {
          minWidth: mathWithUnits(euiTheme.size.base, (x) => x * 22.5),
        },
        [useEuiMaxBreakpoint('m')]: {
          minWidth: 'auto',
        },
      })}
    >
      {cards}
    </EuiFlexGrid>
  );
};
