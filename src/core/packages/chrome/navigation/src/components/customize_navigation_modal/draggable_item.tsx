/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { NavigationItemInfo } from '@kbn/core-chrome-browser';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface Props {
  item: NavigationItemInfo;
  index: number;
  toggleItemVisibility: (id: string) => void;
  isDraggingAny: boolean;
}

const HOVER_SUPPRESS_MS = 400;

export const DraggableItem = ({ item, index, toggleItemVisibility, isDraggingAny }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [suppressHover, setSuppressHover] = useState(false);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    if (wasDraggingRef.current && !isDragging) {
      setSuppressHover(true);
      const id = setTimeout(() => setSuppressHover(false), HOVER_SUPPRESS_MS);
      return () => clearTimeout(id);
    }
    wasDraggingRef.current = isDragging;
  }, [isDragging]);

  const handleToggle = useCallback(() => {
    toggleItemVisibility(item.id);
  }, [item.id, toggleItemVisibility]);

  const panelCss = css`
    padding-left: ${euiTheme.size.s};
    padding-right: ${euiTheme.size.s};
    background-color: ${euiTheme.colors.backgroundBasePlain};

    &:hover {
      background-color: ${euiTheme.colors.backgroundBasePlain};
      background-image: linear-gradient(
        ${euiTheme.colors.backgroundBaseInteractiveHover},
        ${euiTheme.colors.backgroundBaseInteractiveHover}
      );
    }
  `;

  const panelDraggingCss = css`
    background-image: linear-gradient(
      ${euiTheme.colors.backgroundBaseInteractiveHover},
      ${euiTheme.colors.backgroundBaseInteractiveHover}
    );
  `;

  const panelSuppressHoverCss = css`
    &:hover {
      background-image: none;
    }
  `;

  const panelDraggingAnyCss = css`
    cursor: default;
  `;

  const dragAreaCss = css`
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    cursor: grab;
  `;

  const switchAriaLabel = i18n.translate(
    'core.ui.chrome.sideNavigation.customizeNavigation.draggableItemAriaLabel',
    {
      defaultMessage: 'Show {itemTitle}',
      values: { itemTitle: item.title },
    }
  );

  return (
    <EuiDraggable
      key={item.id}
      index={index}
      draggableId={item.id}
      customDragHandle
      hasInteractiveChildren
      usePortal
    >
      {(provided, snapshot) => {
        if (snapshot.isDragging !== isDragging) {
          setIsDragging(snapshot.isDragging);
        }
        return (
        <EuiPanel
          paddingSize="s"
          hasShadow={false}
          css={[
            panelCss,
            snapshot.isDragging && panelDraggingCss,
            (isDraggingAny || suppressHover) && panelSuppressHoverCss,
            isDraggingAny && !snapshot.isDragging && panelDraggingAnyCss,
          ]}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
              <div
                {...provided.dragHandleProps}
                css={dragAreaCss}
                aria-label={i18n.translate(
                  'core.ui.chrome.sideNavigation.customizeNavigation.dragHandleAriaLabel',
                  {
                    defaultMessage: 'Drag handle for {itemTitle}',
                    values: { itemTitle: item.title },
                  }
                )}
              >
                <EuiIcon type="grab" color="subdued" aria-hidden={true} css={css`flex-shrink: 0; margin-right: ${euiTheme.size.s};`} />
                {item.icon && (
                  <EuiIcon
                    type={item.icon}
                    size="m"
                    css={css`flex-shrink: 0; margin-right: ${euiTheme.size.s};`}
                  />
                )}
                <EuiText size="s" css={css`flex: 1; min-width: 0;`}>
                  {item.title}
                </EuiText>
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={switchAriaLabel}
                showLabel={false}
                checked={!item.hidden}
                onChange={handleToggle}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        );
      }}
    </EuiDraggable>
  );
};
