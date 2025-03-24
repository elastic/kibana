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
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { TabMenu } from '../tab_menu';
import { EditTabLabel, type EditTabLabelProps } from './edit_tab_label';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import type {
  TabItem,
  TabsSizeConfig,
  GetTabMenuItems,
  TabsServices,
  TabPreviewData,
} from '../../types';
import { TabWithBackground } from '../tabs_visual_glue_to_header/tab_with_background';
import { TabPreview } from '../tab_preview';

export interface TabProps {
  item: TabItem;
  isSelected: boolean;
  tabContentId: string;
  tabsSizeConfig: TabsSizeConfig;
  getTabMenuItems?: GetTabMenuItems;
  services: TabsServices;
  onLabelEdited: EditTabLabelProps['onLabelEdited'];
  onSelect: (item: TabItem) => Promise<void>;
  onClose: ((item: TabItem) => Promise<void>) | undefined;
  tabPreviewData: TabPreviewData;
}

export const Tab: React.FC<TabProps> = (props) => {
  const {
    item,
    isSelected,
    tabContentId,
    tabsSizeConfig,
    getTabMenuItems,
    services,
    onLabelEdited,
    onSelect,
    onClose,
    tabPreviewData,
  } = props;
  const { euiTheme } = useEuiTheme();
  const tabRef = useRef<HTMLDivElement | null>(null);
  const [isInlineEditActive, setIsInlineEditActive] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isActionPopoverOpen, setActionPopover] = useState<boolean>(false);

  const closeButtonLabel = i18n.translate('unifiedTabs.closeTabButton', {
    defaultMessage: 'Close session',
  });

  const tabButtonAriaLabel = i18n.translate('unifiedTabs.tabButtonAriaLabel', {
    defaultMessage: 'Click to select or double-click to edit session name',
  });

  const hidePreview = () => setShowPreview(false);

  const onSelectEvent = useCallback(
    async (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      hidePreview();

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
      if (event.currentTarget === tabRef.current) {
        // if user presses on the space around the buttons, we should still trigger the onSelectEvent
        await onSelectEvent(event);
      }
    },
    [onSelectEvent]
  );

  const handleDoubleClick = useCallback(() => {
    setIsInlineEditActive(true);
    hidePreview();
  }, []);

  const mainTabContent = (
    <EuiFlexGroup
      alignItems="center"
      direction="row"
      css={getTabContainerCss(euiTheme, tabsSizeConfig, isSelected)}
      responsive={false}
      gutterSize="none"
    >
      <div css={getTabContentCss()}>
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
              onDoubleClick={handleDoubleClick}
            >
              <EuiText color="inherit" size="s" css={getTabLabelCss(euiTheme)}>
                {item.label}
              </EuiText>
            </button>
            <div className="unifiedTabs__tabActions">
              <EuiFlexGroup responsive={false} direction="row" gutterSize="none">
                {!!getTabMenuItems && (
                  <EuiFlexItem grow={false} className="unifiedTabs__tabMenuBtn">
                    <TabMenu
                      item={item}
                      getTabMenuItems={getTabMenuItems}
                      isPopoverOpen={isActionPopoverOpen}
                      setPopover={setActionPopover}
                    />
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

  return (
    <TabPreview
      showPreview={showPreview}
      setShowPreview={setShowPreview}
      stopPreviewOnHover={isInlineEditActive || isActionPopoverOpen}
      tabPreviewData={tabPreviewData}
      tabItem={item}
    >
      <TabWithBackground
        {...getTabAttributes(item, tabContentId)}
        ref={tabRef}
        role="tab"
        aria-selected={isSelected}
        data-test-subj={`unifiedTabs_tab_${item.id}`}
        isSelected={isSelected}
        services={services}
        onClick={onClickEvent}
      >
        {mainTabContent}
      </TabWithBackground>
    </TabPreview>
  );
};

function getTabContainerCss(
  euiTheme: EuiThemeComputed,
  tabsSizeConfig: TabsSizeConfig,
  isSelected: boolean
) {
  // TODO: remove the usage of deprecated colors

  return css`
    display: inline-flex;
    border-right: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.lightShade};
    height: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.xs};
    min-width: ${tabsSizeConfig.regularTabMinWidth}px;
    max-width: ${tabsSizeConfig.regularTabMaxWidth}px;

    color: ${isSelected ? euiTheme.colors.text : euiTheme.colors.subduedText};

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

function getTabLabelCss(euiTheme: EuiThemeComputed) {
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
