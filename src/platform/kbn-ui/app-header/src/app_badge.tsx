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
import type { AppHeaderBadge, AppHeaderBadgeItem } from './types';
import { asOptionalPlainText, asPlainText } from './as_plain_text';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

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
    // Explicit fields only — do not spread the consumer item into EUI.
    const { items: childItems, popoverWidth: childWidth } = item;
    const name = asPlainText(item.name);
    const panelItem: EuiContextMenuPanelItemDescriptor = {
      name,
      icon: item.icon,
      onClick: item.onClick,
      disabled: item.disabled,
      toolTipContent: asOptionalPlainText(item.toolTipContent),
      'data-test-subj': item['data-test-subj'],
    };
    if (childItems && childItems.length > 0) {
      const childPanelId = nextPanelId;
      const childPanels = buildPanels(childItems, childPanelId, childWidth, name);
      nextPanelId = childPanelId + childPanels.length;
      panels.push(...childPanels);
      return { ...panelItem, panel: childPanelId };
    }

    return panelItem;
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
  const label = asPlainText(badge.label);
  const tooltip = asOptionalPlainText(badge.tooltip);
  const onClickAriaLabel = asOptionalPlainText(badge.onClickAriaLabel);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

  if (badge?.renderCustomBadge) {
    // TODO: Remove custom JSX badge rendering once apps migrate custom badges to structured config.
    return badge.renderCustomBadge({ badgeText: badge.label });
  }

  const hasItems = 'items' in badge && badge.items !== undefined;
  const isClickable = hasItems || badge.onClick !== undefined;

  const badgeOnClickAriaLabel =
    onClickAriaLabel ??
    i18n.translate('kbnUI.appHeader.badge.ariaLabel', {
      defaultMessage: 'Click {label} badge',
      values: { label },
    });

  const handleBadgeClick = () => {
    if (hasItems) {
      togglePopover();
      return;
    }
    badge?.onClick?.();
  };

  const interactionProps = isClickable
    ? { onClick: handleBadgeClick, onClickAriaLabel: badgeOnClickAriaLabel }
    : {};

  const badgeComponent = (
    <EuiBadge
      {...interactionProps}
      color={badge?.color ?? 'hollow'}
      data-test-subj={badge?.['data-test-subj'] ?? APP_HEADER_TEST_SUBJECTS.badge}
      css={badgeStyle}
      iconType={hasItems ? 'chevronSingleDown' : undefined}
      iconSide={hasItems ? 'right' : undefined}
    >
      {label}
    </EuiBadge>
  );

  const wrappedBadge = tooltip ? (
    <EuiToolTip content={tooltip}>{badgeComponent}</EuiToolTip>
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
        aria-label={label}
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
