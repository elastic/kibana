/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiBadgeGroup, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';

export interface ChangePointEntityTitleProps {
  card: ChangePointCardModel;
}

/**
 * Title row rendered above each mini chart card. Each entity key-value pair is
 * rendered as a hollow badge. A single EuiToolTip wraps the entire group and
 * shows the full entity description on hover.
 *
 * EuiBadgeGroup is used as the flex container so EuiBadge elements are direct
 * flex children. This allows `flex: 0 1 auto; min-width: 0` to actually take
 * effect, enabling EUI's built-in `euiBadge__text { euiTextTruncate() }` to
 * truncate text with an ellipsis when the row is too narrow.
 *
 * EuiToolTip display="block" makes its anchor <span> fill the outer container,
 * giving the badge group a definite bounded width for the flex-shrink calculations.
 * anchorProps.style.flexShrink=0 ensures the anchor — which is the direct flex
 * item inside the chart card's flex column — does not shrink.
 */
export const ChangePointEntityTitle: React.FC<ChangePointEntityTitleProps> = ({ card }) => {
  const { euiTheme } = useEuiTheme();
  const entityEntries = useMemo(() => Object.entries(card.entityValues), [card.entityValues]);

  return (
    <EuiToolTip
      content={card.entityDescription ?? card.title}
      position="top"
      display="block"
      anchorProps={{ style: { flexShrink: 0 } }}
    >
      <EuiBadgeGroup
        gutterSize="xs"
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        `}
      >
        {entityEntries.length > 0 ? (
          entityEntries.map(([key, value]) => (
            <EuiBadge key={key} color="hollow">
              <strong>{key}:</strong> {value}
            </EuiBadge>
          ))
        ) : (
          <EuiBadge
            color="hollow"
            css={css`
              flex: 0 1 auto;
              min-width: 0;
            `}
          >
            {card.title}
          </EuiBadge>
        )}
      </EuiBadgeGroup>
    </EuiToolTip>
  );
};
