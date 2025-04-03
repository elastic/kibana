/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { MouseEvent, KeyboardEvent, useCallback, useState, useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import useEvent from 'react-use/lib/useEvent';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  type EuiThemeComputed,
  type DraggableProvidedDragHandleProps,
  keys,
} from '@elastic/eui';
import { TabMenu } from '../tab_menu';
import { EditTabLabel, type EditTabLabelProps } from './edit_tab_label';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import type { TabItem, TabsSizeConfig, GetTabMenuItems, TabsServices } from '../../types';
import { TabWithBackground } from '../tabs_visual_glue_to_header/tab_with_background';
import { TabPreview, type TabPreviewProps } from '../tab_preview';

export interface TabProps {
  item: TabItem;
  isSelected: boolean;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  tabContentId: string;
  tabsSizeConfig: TabsSizeConfig;
  getTabMenuItems?: GetTabMenuItems;
  getPreviewData: TabPreviewProps['getPreviewData'];
  services: TabsServices;
  onLabelEdited: EditTabLabelProps['onLabelEdited'];
  onSelect: (item: TabItem) => Promise<void>;
  onClose: ((item: TabItem) => Promise<void>) | undefined;
  onSelectedTabKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => Promise<void>;
}

export const Tab: React.FC<TabProps> = (props) => {
  const {
    item,
    isSelected,
    isDragging,
    dragHandleProps,
    tabContentId,
    tabsSizeConfig,
    getTabMenuItems,
    getPreviewData,
    services,
    onLabelEdited,
    onSelect,
    onClose,
    onSelectedTabKeyDown,
  } = props;
  const { euiTheme } = useEuiTheme();
  const tabInteractiveElementRef = useRef<HTMLDivElement | null>(null);
  const [isInlineEditActive, setIsInlineEditActive] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isActionPopoverOpen, setActionPopover] = useState<boolean>(false);

  const closeButtonLabel = i18n.translate('unifiedTabs.closeTabButton', {
    defaultMessage: 'Close session',
  });

  const tabButtonAriaLabel = i18n.translate('unifiedTabs.tabButtonAriaLabel', {
    defaultMessage: 'Click to select, double-click to edit session name, or drag to reorder',
  });

  const hidePreview = useCallback(() => setShowPreview(false), [setShowPreview]);

  const onToggleActionsMenu = useCallback(
    (isOpen: boolean) => {
      setActionPopover(isOpen);
      hidePreview();
    },
    [setActionPopover, hidePreview]
  );

  const onSelectEvent = useCallback(
    async (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      event.stopPropagation();
      hidePreview();

      if (!isSelected) {
        await onSelect(item);
      }
    },
    [onSelect, item, isSelected, hidePreview]
  );

  const onCloseEvent = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      await onClose?.(item);
    },
    [onClose, item]
  );

  const onClick = useCallback(
    async (event: MouseEvent<HTMLDivElement>) => {
      if (document.activeElement && document.activeElement !== event.target) {
        (document.activeElement as HTMLElement).blur();
      }
      await onSelectEvent(event);
    },
    [onSelectEvent]
  );

  const onDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setIsInlineEditActive(true);
      hidePreview();
    },
    [setIsInlineEditActive, hidePreview]
  );

  const onKeyDownEvent = useCallback(
    async (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === keys.ENTER) {
        event.preventDefault();
        tabInteractiveElementRef.current?.focus();
        await onSelectEvent(event);
      }
    },
    [onSelectEvent]
  );

  const onGlobalKeyDown = useCallback(
    async (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        !isSelected ||
        isDragging ||
        document.activeElement !== tabInteractiveElementRef.current
      ) {
        return;
      }

      await onSelectedTabKeyDown?.(event);
    },
    [onSelectedTabKeyDown, isSelected, isDragging]
  );

  useEvent('keydown', onGlobalKeyDown);

  useEffect(() => {
    if (isDragging && tabInteractiveElementRef.current) {
      tabInteractiveElementRef.current.focus();
    }
  }, [isDragging]);

  useEffect(() => {
    if (isInlineEditActive && !isSelected) {
      setIsInlineEditActive(false);
    }
  }, [isInlineEditActive, isSelected, setIsInlineEditActive]);

  const mainTabContent = (
    <EuiFlexGroup
      alignItems="center"
      direction="row"
      css={getTabContainerCss(euiTheme, tabsSizeConfig, isSelected, isDragging)}
      responsive={false}
      gutterSize="none"
    >
      {!isInlineEditActive && (
        <div
          ref={tabInteractiveElementRef}
          aria-label={tabButtonAriaLabel}
          css={tabInteractiveElementCss}
          {...dragHandleProps}
          {...getTabAttributes(item, tabContentId)}
          role="tab"
          tabIndex={isSelected ? 0 : -1}
          aria-selected={isSelected}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDownEvent}
        />
      )}
      <div css={getTabContentCss()}>
        {isInlineEditActive ? (
          <EditTabLabel
            item={item}
            onLabelEdited={onLabelEdited}
            onExit={() => setIsInlineEditActive(false)}
          />
        ) : (
          <>
            <div
              css={getTabButtonCss(euiTheme)}
              className="unifiedTabs__tabLabel"
              data-test-subj={`unifiedTabs_selectTabBtn_${item.id}`}
            >
              <EuiText color="inherit" size="s" css={getTabLabelCss(euiTheme)}>
                {item.label}
              </EuiText>
            </div>
            <div className="unifiedTabs__tabActions">
              <EuiFlexGroup responsive={false} direction="row" gutterSize="none">
                {!!getTabMenuItems && (
                  <EuiFlexItem grow={false} className="unifiedTabs__tabMenuBtn">
                    <TabMenu
                      item={item}
                      getTabMenuItems={getTabMenuItems}
                      isPopoverOpen={isActionPopoverOpen}
                      setPopover={onToggleActionsMenu}
                    />
                  </EuiFlexItem>
                )}
                {!!onClose && (
                  <EuiFlexItem grow={false} className="unifiedTabs__closeTabBtn">
                    <EuiButtonIcon
                      // semantically role="tablist" does not allow other buttons in tabs
                      aria-hidden={true}
                      tabIndex={-1}
                      aria-label={closeButtonLabel} // TODO: replace with a EuiToolTip
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
      tabItem={item}
      getPreviewData={getPreviewData}
    >
      <TabWithBackground
        data-test-subj={`unifiedTabs_tab_${item.id}`}
        isSelected={isSelected}
        isDragging={isDragging}
        services={services}
      >
        {mainTabContent}
      </TabWithBackground>
    </TabPreview>
  );
};

const tabInteractiveElementCss = css`
  position: absolute;
  inset: 0;
`;

function getTabContainerCss(
  euiTheme: EuiThemeComputed,
  tabsSizeConfig: TabsSizeConfig,
  isSelected: boolean,
  isDragging?: boolean
) {
  // TODO: remove the usage of deprecated colors

  return css`
    position: relative;
    display: inline-flex;
    border-right: ${euiTheme.border.thin};
    border-color: ${isDragging ? 'transparent' : euiTheme.colors.lightShade};
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
      pointer-events: auto;
    }

    &:hover,
    &:focus-within {
      .unifiedTabs__tabActions {
        opacity: 1;
      }

      .unifiedTabs__tabLabel {
        width: calc(100% - ${euiTheme.size.l} * 2);
      }
    }

    ${!isSelected
      ? `
          &:hover {
            color: ${euiTheme.colors.text};
        }`
      : ''}
  `;
}

function getTabContentCss() {
  return css`
    position: relative;
    width: 100%;
    pointer-events: none;
  `;
}

function getTabButtonCss(euiTheme: EuiThemeComputed) {
  return css`
    width: 100%;
    height: ${euiTheme.size.l};
    padding-top: ${euiTheme.size.xxs};
    padding-inline: ${euiTheme.size.xs};
    text-align: left;
    color: inherit;
    border: none;
    border-radius: 0;
    background: transparent;
    pointer-events: none;
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
