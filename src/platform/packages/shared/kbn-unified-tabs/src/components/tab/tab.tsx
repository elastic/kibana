/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { MouseEvent, useCallback, useState, useRef } from 'react';
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
import { EditTabLabel, type EditTabLabelProps } from './edit_tab_label';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import type { TabItem, TabsSizeConfig, GetTabMenuItems } from '../../types';

export interface TabProps {
  item: TabItem;
  isSelected: boolean;
  tabContentId: string;
  tabsSizeConfig: TabsSizeConfig;
  getTabMenuItems?: GetTabMenuItems;
  onLabelEdited: EditTabLabelProps['onLabelEdited'];
  onSelect: (item: TabItem) => Promise<void>;
  onClose: ((item: TabItem) => Promise<void>) | undefined;
}

export const Tab: React.FC<TabProps> = ({
  item,
  isSelected,
  tabContentId,
  tabsSizeConfig,
  getTabMenuItems,
  onLabelEdited,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>();
  const [isInlineEditActive, setIsInlineEditActive] = useState<boolean>(false);

  const tabContainerDataTestSubj = `unifiedTabs_tab_${item.id}`;
  const closeButtonLabel = i18n.translate('unifiedTabs.closeTabButton', {
    defaultMessage: 'Close session',
  });

  const tabButtonAriaLabel = i18n.translate('unifiedTabs.tabButtonAriaLabel', {
    defaultMessage: 'Click to select or double-click to edit session name',
  });

  const onSelectEvent = useCallback(
    async (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();

      if (!isSelected) {
        await onSelect(item);
      }
    },
    [onSelect, item, isSelected]
  );

  const onCloseEvent = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      await onClose?.(item);
    },
    [onClose, item]
  );

  const onClickEvent = useCallback(
    async (event: MouseEvent<HTMLDivElement>) => {
      if (event.currentTarget === containerRef.current) {
        // if user presses on the space around the buttons, we should still trigger the onSelectEvent
        await onSelectEvent(event);
      }
    },
    [onSelectEvent]
  );

  return (
    <EuiFlexGroup
      ref={containerRef}
      {...getTabAttributes(item, tabContentId)}
      role="tab"
      aria-selected={isSelected}
      alignItems="center"
      direction="row"
      css={getTabContainerCss(euiTheme, tabsSizeConfig, isSelected)}
      data-test-subj={tabContainerDataTestSubj}
      responsive={false}
      gutterSize="none"
      onClick={onClickEvent}
    >
      <div css={getTabContentCss(euiTheme)}>
        {isInlineEditActive ? (
          <EditTabLabel
            item={item}
            onLabelEdited={onLabelEdited}
            onExit={() => setIsInlineEditActive(false)}
          />
        ) : (
          <>
            <button
              aria-label={tabButtonAriaLabel}
              css={getTabButtonCss(euiTheme)}
              className="unifiedTabs__tabBtn"
              data-test-subj={`unifiedTabs_selectTabBtn_${item.id}`}
              type="button"
              onClick={onSelectEvent}
              onDoubleClick={() => setIsInlineEditActive(true)}
            >
              <EuiText color="inherit" size="s" css={getTabLabelCss(euiTheme, tabsSizeConfig)}>
                {item.label}
              </EuiText>
            </button>
            <div className="unifiedTabs__tabActions">
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
            </div>
          </>
        )}
      </div>
    </EuiFlexGroup>
  );
};

function getTabContainerCss(
  euiTheme: EuiThemeComputed,
  tabsSizeConfig: TabsSizeConfig,
  isSelected: boolean
) {
  // TODO: remove the usage of deprecated colors

  return css`
    border-right: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.lightShade};
    height: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.xs};
    min-width: ${tabsSizeConfig.regularTabMinWidth}px;
    max-width: ${tabsSizeConfig.regularTabMaxWidth}px;

    background-color: ${isSelected ? euiTheme.colors.emptyShade : euiTheme.colors.lightestShade};
    color: ${isSelected ? euiTheme.colors.text : euiTheme.colors.subduedText};
    transition: background-color ${euiTheme.animation.fast};

    .unifiedTabs__tabActions {
      position: absolute;
      top: 0;
      right: 0;
      opacity: 0;
      transition: opacity ${euiTheme.animation.fast};
    }

    &:hover,
    &:focus-within {
      .unifiedTabs__tabActions {
        opacity: 1;
      }

      .unifiedTabs__tabBtn {
        width: calc(100% - ${euiTheme.size.l} * 2);
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

function getTabContentCss() {
  return css`
    position: relative;
    width: 100%;
  `;
}

function getTabButtonCss(euiTheme: EuiThemeComputed) {
  return css`
    width: 100%;
    height: ${euiTheme.size.l};
    padding-inline: ${euiTheme.size.xs};
    text-align: left;
    color: inherit;
    border: none;
    border-radius: 0;
    background: transparent;
  `;
}

function getTabLabelCss(euiTheme: EuiThemeComputed, tabsSizeConfig: TabsSizeConfig) {
  return css`
    padding-right: ${euiTheme.size.s};
    white-space: nowrap;
    mask-image: linear-gradient(
      to right,
      rgb(255, 0, 0) calc(100% - ${euiTheme.size.s}),
      rgba(255, 0, 0, 0.1) 100%
    );
    transform: translateZ(0);
    overflow: hidden;
  `;
}
