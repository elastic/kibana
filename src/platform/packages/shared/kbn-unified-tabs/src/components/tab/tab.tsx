/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { MouseEvent, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiThemeComputed,
  useEuiTheme,
} from '@elastic/eui';
import { TabMenu } from '../tab_menu';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import type { TabItem, GetTabMenuItems } from '../../types';

export interface TabProps {
  item: TabItem;
  isSelected: boolean;
  tabContentId: string;
  getTabMenuItems?: GetTabMenuItems;
  onSelect: (item: TabItem) => void;
  onClose: ((item: TabItem) => void) | undefined;
}

export const Tab: React.FC<TabProps> = ({
  item,
  isSelected,
  tabContentId,
  getTabMenuItems,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>();

  const tabContainerDataTestSubj = `unifiedTabs_tab_${item.id}`;
  const closeButtonLabel = i18n.translate('unifiedTabs.closeTabButton', {
    defaultMessage: 'Close',
  });

  const onSelectEvent = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();

      if (!isSelected) {
        onSelect(item);
      }
    },
    [onSelect, item, isSelected]
  );

  const onCloseEvent = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClose?.(item);
    },
    [onClose, item]
  );

  const onClickEvent = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.currentTarget === containerRef.current) {
        // if user presses on the space around the buttons, we should still trigger the onSelectEvent
        onSelectEvent(event);
      }
    },
    [onSelectEvent]
  );

  return (
    <EuiFlexGroup
      ref={containerRef}
      alignItems="center"
      css={getTabContainerCss(euiTheme, isSelected)}
      data-test-subj={tabContainerDataTestSubj}
      responsive={false}
      gutterSize="none"
      onClick={onClickEvent}
    >
      <button
        {...getTabAttributes(item, tabContentId)}
        aria-selected={isSelected}
        css={getTabButtonCss(euiTheme)}
        className="unifiedTabs__tabBtn"
        data-test-subj={`unifiedTabs_selectTabBtn_${item.id}`}
        role="tab"
        type="button"
        onClick={onSelectEvent}
      >
        <EuiText color="inherit" size="s" className="eui-textTruncate">
          {item.label}
        </EuiText>
      </button>
      <EuiFlexItem grow={false} className="unifiedTabs__tabActions">
        <EuiFlexGroup responsive={false} direction="row" gutterSize="none">
          {!!getTabMenuItems && (
            <EuiFlexItem grow={false} className="unifiedTabs__tabMenuBtn">
              <TabMenu item={item} getTabMenuItems={getTabMenuItems} />
            </EuiFlexItem>
          )}
          {!!onClose && (
            <EuiFlexItem grow={false} className="unifiedTabs__closeTabBtn">
              <EuiButtonIcon
                aria-label={closeButtonLabel}
                title={closeButtonLabel}
                color="text"
                data-test-subj={`unifiedTabs_closeTabBtn_${item.id}`}
                iconType="cross"
                onClick={onCloseEvent}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function getTabContainerCss(euiTheme: EuiThemeComputed, isSelected: boolean) {
  // TODO: remove the usage of deprecated colors

  return css`
    display: inline-flex;
    border-right: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.lightShade};
    height: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.xs};
    min-width: 96px;
    max-width: 280px;

    background-color: ${isSelected ? euiTheme.colors.emptyShade : euiTheme.colors.lightestShade};
    color: ${isSelected ? euiTheme.colors.text : euiTheme.colors.subduedText};
    transition: background-color ${euiTheme.animation.fast};

    .unifiedTabs__tabActions {
      opacity: 0;
      transition: opacity ${euiTheme.animation.fast};
    }

    &:hover,
    &:focus-within {
      .unifiedTabs__tabActions {
        opacity: 1;
      }
    }

    ${isSelected
      ? `
          .unifiedTabs__tabBtn {
            cursor: default;
          }`
      : `
          cursor: pointer;

          &:hover {
            background-color: ${euiTheme.colors.lightShade};
            color: ${euiTheme.colors.text};
        }`}
  `;
}

function getTabButtonCss(euiTheme: EuiThemeComputed) {
  return css`
    width: 100%;
    min-height: 100%;
    min-width: 0;
    flex-grow: 1;
    padding-inline: ${euiTheme.size.xs};
    text-align: left;
    color: inherit;
    border: none;
    border-radius: 0;
    background: transparent;
  `;
}
