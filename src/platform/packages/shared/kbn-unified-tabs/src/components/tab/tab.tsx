/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  MouseEvent,
  KeyboardEvent,
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiThemeComputed,
  type DraggableProvidedDragHandleProps,
  keys,
  useGeneratedHtmlId,
  EuiProgress,
  EuiTextTruncate,
} from '@elastic/eui';
import { TabMenu } from '../tab_menu';
import { EditTabLabel, type EditTabLabelProps } from './edit_tab_label';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import type { TabItem, TabsSizeConfig, GetTabMenuItems, TabsServices } from '../../types';
import { TabStatus, type TabPreviewData } from '../../types';
import { TabWithBackground } from '../tabs_visual_glue_to_header/tab_with_background';
import { TabPreview } from '../tab_preview';

export interface TabProps {
  item: TabItem;
  isSelected: boolean;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  tabContentId: string;
  tabsSizeConfig: TabsSizeConfig;
  getTabMenuItems?: GetTabMenuItems;
  getPreviewData: (item: TabItem) => TabPreviewData;

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
  const tabLabelId = useGeneratedHtmlId({ prefix: 'tabLabel' });
  const tabInteractiveElementRef = useRef<HTMLDivElement | null>(null);
  const [isInlineEditActive, setIsInlineEditActive] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isActionPopoverOpen, setActionPopover] = useState<boolean>(false);
  const previewData = useMemo(() => getPreviewData(item), [getPreviewData, item]);

  const closeButtonLabel = i18n.translate('unifiedTabs.closeTabButton', {
    defaultMessage: 'Close session',
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
    (event?: MouseEvent<HTMLDivElement>) => {
      event?.stopPropagation();
      hidePreview();
      setActionPopover(false);
      setIsInlineEditActive(true);
    },
    [setIsInlineEditActive, hidePreview, setActionPopover]
  );

  const onEnterRenaming = useCallback(async () => {
    if (!isSelected) {
      await onSelect(item);
    }
    onDoubleClick();
  }, [item, isSelected, onDoubleClick, onSelect]);

  const onKeyDownEvent = useCallback(
    async (event: KeyboardEvent<HTMLDivElement>) => {
      // per https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

      if (!isSelected && event.key === keys.ENTER) {
        event.preventDefault();
        tabInteractiveElementRef.current?.focus();
        await onSelectEvent(event);
        return;
      }

      if (!isSelected || isDragging) {
        return;
      }

      if (event.key === 'F10' && event.shiftKey) {
        event.preventDefault();
        setActionPopover(true);
        return;
      }

      await onSelectedTabKeyDown?.(event);
    },
    [isSelected, isDragging, onSelectEvent, setActionPopover, onSelectedTabKeyDown]
  );

  useEffect(() => {
    if (isInlineEditActive && !isSelected) {
      setIsInlineEditActive(false);
    }
  }, [isInlineEditActive, isSelected, setIsInlineEditActive]);

  const mainTabContent = (
    <div css={getTabContainerCss(euiTheme, tabsSizeConfig, isSelected, isDragging)}>
      <div
        ref={tabInteractiveElementRef}
        {...dragHandleProps}
        {...getTabAttributes(item, tabContentId)}
        data-test-subj={`unifiedTabs_selectTabBtn_${item.id}`}
        aria-labelledby={tabLabelId}
        role="tab"
        tabIndex={isSelected ? 0 : -1}
        aria-haspopup={!isInlineEditActive}
        aria-selected={isSelected}
        onClick={isInlineEditActive ? undefined : onClick}
        onDoubleClick={isInlineEditActive ? undefined : onDoubleClick}
        onKeyDown={isInlineEditActive ? undefined : onKeyDownEvent}
      >
        <div css={getTabContentCss(euiTheme)}>
          {isInlineEditActive ? (
            <EditTabLabel
              item={item}
              onLabelEdited={onLabelEdited}
              onExit={() => {
                setIsInlineEditActive(false);
                tabInteractiveElementRef.current?.focus();
              }}
            />
          ) : (
            <div css={getTabLabelContainerCss(euiTheme)} className="unifiedTabs__tabLabel">
              {previewData.status === TabStatus.RUNNING && (
                <EuiProgress size="xs" color="accent" position="absolute" />
              )}
              <EuiText
                id={tabLabelId}
                color="inherit"
                size="s"
                css={getTabLabelCss(euiTheme)}
                className="unifiedTabs__tabLabelText"
              >
                <EuiTextTruncate
                  text={item.label}
                  // Truncation width must be equal to max tab width minus padding
                  width={tabsSizeConfig.regularTabMaxWidth - euiTheme.base}
                  truncation="middle"
                />
              </EuiText>
            </div>
          )}
        </div>
      </div>
      {!isInlineEditActive && (
        <div className="unifiedTabs__tabActions">
          <EuiFlexGroup responsive={false} direction="row" gutterSize="none">
            {!!getTabMenuItems && (
              <EuiFlexItem grow={false} className="unifiedTabs__tabMenuBtn">
                <TabMenu
                  item={item}
                  getTabMenuItems={getTabMenuItems}
                  isPopoverOpen={isActionPopoverOpen}
                  setPopover={onToggleActionsMenu}
                  onEnterRenaming={onEnterRenaming}
                />
              </EuiFlexItem>
            )}
            {!!onClose && (
              <EuiFlexItem grow={false} className="unifiedTabs__closeTabBtn">
                <EuiToolTip content={closeButtonLabel}>
                  <EuiButtonIcon
                    // semantically role="tablist" does not allow other buttons in tabs
                    aria-hidden={true}
                    tabIndex={-1}
                    color="text"
                    data-test-subj={`unifiedTabs_closeTabBtn_${item.id}`}
                    iconType="cross"
                    onClick={onCloseEvent}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      )}
    </div>
  );

  return (
    <TabPreview
      showPreview={showPreview}
      setShowPreview={setShowPreview}
      stopPreviewOnHover={isInlineEditActive || isActionPopoverOpen}
      tabItem={item}
      previewData={previewData}
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

function getTabContainerCss(
  euiTheme: EuiThemeComputed,
  tabsSizeConfig: TabsSizeConfig,
  isSelected: boolean,
  isDragging?: boolean
) {
  // TODO: remove the usage of deprecated colors

  return css`
    position: relative;
    display: inline-block;
    border-right: ${euiTheme.border.thin};
    border-color: ${isDragging ? 'transparent' : euiTheme.colors.lightShade};
    height: ${euiTheme.size.xl};
    min-width: ${tabsSizeConfig.regularTabMinWidth}px;
    max-width: ${tabsSizeConfig.regularTabMaxWidth}px;

    color: ${isSelected ? euiTheme.colors.text : euiTheme.colors.subduedText};

    .unifiedTabs__tabActions {
      position: absolute;
      top: ${euiTheme.size.xs};
      right: ${euiTheme.size.xs};
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

      .unifiedTabs__tabLabelText {
        mask-image: linear-gradient(
          to right,
          rgb(255, 0, 0) calc(100% - ${euiTheme.size.s}),
          rgba(255, 0, 0, 0.1) 100%
        );
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

function getTabContentCss(euiTheme: EuiThemeComputed) {
  return css`
    position: relative;
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: ${euiTheme.size.xl};
    padding-inline: ${euiTheme.size.xs};
  `;
}

function getTabLabelContainerCss(euiTheme: EuiThemeComputed) {
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
  `;
}

function getTabLabelCss(euiTheme: EuiThemeComputed) {
  return css`
    white-space: nowrap;
    transform: translateZ(0);
    overflow: hidden;
  `;
}
