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
import type { TabItem, GetTabMenuItems } from '../../types';
import { TabPreview } from '../tab_preview';

export interface TabProps {
  item: TabItem;
  isSelected: boolean;
  tabContentId: string;
  getTabMenuItems?: GetTabMenuItems;
  onLabelEdited: EditTabLabelProps['onLabelEdited'];
  onSelect: (item: TabItem) => Promise<void>;
  onClose: ((item: TabItem) => Promise<void>) | undefined;
}

export const Tab: React.FC<TabProps> = ({
  item,
  isSelected,
  tabContentId,
  getTabMenuItems,
  onLabelEdited,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInlineEditActive, setIsInlineEditActive] = useState<boolean>(false);

  const tabContainerDataTestSubj = `unifiedTabs_tab_${item.id}`;
  const closeButtonLabel = i18n.translate('unifiedTabs.closeTabButton', {
    defaultMessage: 'Close session',
  });

  const tabButtonAriaLabel = i18n.translate('unifiedTabs.tabButtonAriaLabel', {
    defaultMessage: 'Click to select or double-click to edit session name',
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
    <TabPreview>
      <EuiFlexGroup
        ref={containerRef}
        {...getTabAttributes(item, tabContentId)}
        role="tab"
        aria-selected={isSelected}
        alignItems="center"
        css={getTabContainerCss(euiTheme, isSelected)}
        data-test-subj={tabContainerDataTestSubj}
        responsive={false}
        gutterSize="none"
        onClick={onClickEvent}
      >
        {isInlineEditActive ? (
          <div css={getTabButtonCss(euiTheme)}>
            <EditTabLabel
              item={item}
              onLabelEdited={onLabelEdited}
              onExit={() => setIsInlineEditActive(false)}
            />
          </div>
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
          </>
        )}
      </EuiFlexGroup>
    </TabPreview>
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
    border-radius: 0;
    background: transparent;
  `;
}
