/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppBadge } from './app_badge';
import { useAppBadges } from './hooks/use_app_badges';

const MAX_VISIBLE_BADGES = 2;

const useBadgesStyle = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const badgesContainer = css`
      margin-left: ${euiTheme.size.s};

      /* Deprecated renderCustomBadge items may return null at runtime,
         leaving empty EuiFlexItem wrappers in the DOM. Hide the container
         when none of its children have visible content to avoid a stale
         margin-left gap next to the title. */
      &:not(:has(.euiFlexItem:not(:empty))) {
        display: none;
      }
    `;

    return { badgesContainer };
  }, [euiTheme]);
};

export const AppBadges = memo(() => {
  const badges = useAppBadges();
  const { badgesContainer } = useBadgesStyle();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!badges || badges.length === 0) {
    return null;
  }

  const visibleBadges = badges.slice(0, MAX_VISIBLE_BADGES);
  const overflowBadges = badges.slice(MAX_VISIBLE_BADGES);

  const handleClosePopover = () => {
    setIsPopoverOpen(false);
  };

  const handleTogglePopover = () => {
    setIsPopoverOpen((open) => !open);
  };

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      css={badgesContainer}
    >
      {visibleBadges.map((badge) => (
        <EuiFlexItem grow={false} key={badge.label}>
          <AppBadge badge={badge} />
        </EuiFlexItem>
      ))}
      {overflowBadges.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.translate('core.ui.chrome.appHeader.badges.popoverAriaLabel', {
              defaultMessage: 'More badges',
            })}
            button={
              <EuiBadge
                color="hollow"
                onClick={handleTogglePopover}
                onClickAriaLabel={i18n.translate(
                  'core.ui.chrome.appHeader.badges.overflowAriaLabel',
                  {
                    defaultMessage: 'Show {count} more badges',
                    values: { count: overflowBadges.length },
                  }
                )}
              >
                +{overflowBadges.length}
              </EuiBadge>
            }
            isOpen={isPopoverOpen}
            closePopover={handleClosePopover}
            panelPaddingSize="s"
          >
            <EuiFlexGroup direction="column" gutterSize="xs">
              {overflowBadges.map((badge) => (
                <EuiFlexItem key={badge.label}>
                  <AppBadge badge={badge} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

AppBadges.displayName = 'AppBadges';
