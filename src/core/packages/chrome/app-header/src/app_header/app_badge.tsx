/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBadge, AppHeaderBadgeItem } from '../types';

/**
 * Recursively builds flat EuiContextMenu panels from nested badge menu items.
 */
const buildPanels = (
  items: AppHeaderBadgeItem[],
  panelId: number,
  width?: number,
  title?: string
): EuiContextMenuPanelDescriptor[] => {
  const panels: EuiContextMenuPanelDescriptor[] = [];
  let nextPanelId = panelId + 1;

  const panelItems: EuiContextMenuPanelItemDescriptor[] = items.map((item) => {
    const { items: childItems, popoverWidth: childWidth, ...rest } = item;
    if (childItems && childItems.length > 0) {
      const childPanelId = nextPanelId;
      const childPanels = buildPanels(childItems, childPanelId, childWidth, item.name);
      nextPanelId = childPanelId + childPanels.length;
      panels.push(...childPanels);
      return { ...rest, panel: childPanelId };
    }

    return rest;
  });

  panels.unshift({
    id: panelId,
    items: panelItems,
    ...(title && { title }),
    ...(width && { width }),
  });

  return panels;
};

const useBadgeStyle = () => {
  return useMemo(() => {
    const badge = css`
      max-width: 200px;
    `;

    return { badge };
  }, []);
};

export const AppBadge = ({ badge }: { badge: AppHeaderBadge }) => {
  const { badge: badgeStyle } = useBadgeStyle();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

  if (badge?.renderCustomBadge) {
    // TODO: Remove custom JSX badge rendering once apps migrate custom badges to structured config.
    return badge.renderCustomBadge({ badgeText: badge.label });
  }

  const hasItems = 'items' in badge && badge.items !== undefined;

  const badgeOnClickAriaLabel =
    badge?.onClickAriaLabel ??
    i18n.translate('core.ui.chrome.appHeader.badge.ariaLabel', {
      defaultMessage: 'Click {label} badge',
      values: { label: badge.label },
    });

  const handleBadgeClick = () => {
    if (hasItems) {
      togglePopover();
      return;
    }
    badge?.onClick?.();
  };

  const badgeComponent = (
    <EuiBadge
      onClick={handleBadgeClick}
      onClickAriaLabel={badgeOnClickAriaLabel}
      color={badge?.color ?? 'hollow'}
      data-test-subj={badge?.['data-test-subj']}
      css={badgeStyle}
      iconType={hasItems ? 'arrowDown' : undefined}
      iconSide={hasItems ? 'right' : undefined}
    >
      {badge.label}
    </EuiBadge>
  );

  const wrappedBadge = badge?.tooltip ? (
    <EuiToolTip content={badge.tooltip}>{badgeComponent}</EuiToolTip>
  ) : (
    badgeComponent
  );

  if (hasItems) {
    return (
      <EuiPopover
        button={wrappedBadge}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        aria-label={badge.label}
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={buildPanels(badge.items!, 0, badge.popoverWidth)}
        />
      </EuiPopover>
    );
  }

  return wrappedBadge;
};

AppBadge.displayName = 'AppBadge';
