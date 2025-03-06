/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { MouseEvent, KeyboardEvent, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import classnames from 'classnames';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiThemeComputed,
  keys,
  useEuiTheme,
} from '@elastic/eui';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import type { TabItem } from '../../types';

export interface TabProps {
  item: TabItem;
  isDragging?: boolean;
  isDraggedOver?: boolean;
  isSelected: boolean;
  tabContentId: string;
  onSelect: (item: TabItem) => void;
  onClose: (item: TabItem) => void;
}

export const Tab: React.FC<TabProps> = ({
  item,
  isDragging,
  isDraggedOver,
  isSelected,
  tabContentId,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();

  const tabContainerDataTestSubj = `unifiedTabs_tab_${item.id}`;
  const closeButtonLabel = i18n.translate('unifiedTabs.closeTabButton', {
    defaultMessage: 'Close',
  });

  const onSelectEvent = useCallback(
    (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!isSelected) {
        onSelect(item);
      }
    },
    [onSelect, item, isSelected]
  );

  const onKeyDownEvent = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === keys.ENTER || event.key === keys.SPACE) {
        event.preventDefault();
        onSelectEvent(event);
      }
    },
    [onSelectEvent]
  );

  const onCloseEvent = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClose(item);
    },
    [onClose, item]
  );

  return (
    <div {...getTabAttributes(item, tabContentId)} aria-selected={isSelected} role="tab">
      <EuiFlexGroup
        alignItems="center"
        css={getTabContainerCss(euiTheme, isSelected)}
        className={classnames('unifiedTabs__tab', {
          'unifiedTabs__tab--isDragging': isDragging,
          'unifiedTabs__tab--noDragging': !isDraggedOver,
        })}
        data-test-subj={tabContainerDataTestSubj}
        responsive={false}
        gutterSize="none"
      >
        <div
          role="button"
          tabIndex={0}
          css={getTabButtonCss(euiTheme)}
          className="unifiedTabs__tabBtn"
          data-test-subj={`unifiedTabs_selectTabBtn_${item.id}`}
          onClick={onSelectEvent}
          onKeyDown={onKeyDownEvent}
        >
          <EuiText color="inherit" size="s" className="eui-textTruncate">
            {item.label}
          </EuiText>
        </div>
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
      </EuiFlexGroup>
    </div>
  );
};

function getTabContainerCss(euiTheme: EuiThemeComputed, isSelected: boolean) {
  // TODO: remove the usage of deprecated colors

  return css`
    display: inline-flex;
    border-right: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.lightShade};
    height: ${euiTheme.size.xl};
    padding-left: ${euiTheme.size.m};
    padding-right: ${euiTheme.size.xs};
    min-width: 96px;
    max-width: 280px;

    background-color: ${isSelected ? euiTheme.colors.emptyShade : euiTheme.colors.lightestShade};
    color: ${isSelected ? euiTheme.colors.text : euiTheme.colors.subduedText};
    transition: background-color ${euiTheme.animation.fast}, padding ${euiTheme.animation.fast};

    .unifiedTabs__closeTabBtn {
      flex-shrink: 0;
      opacity: 0;
      transition: opacity ${euiTheme.animation.fast};
    }

    &:hover {
      .unifiedTabs__closeTabBtn {
        opacity: 1;
      }
    }

    .unifiedTabs__tabDragHandle {
      flex-shrink: 0;
      width: 0;
      overflow: hidden;
      transition: width ${euiTheme.animation.normal};
    }

    &.unifiedTabs__tab--isDragging,
    &.unifiedTabs__tab--noDragging:hover {
      padding-left: ${euiTheme.size.xs};

      .unifiedTabs__tabDragHandle {
        width: ${euiTheme.size.m};
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
    min-width: 0;
    flex-grow: 1;
    padding-right: ${euiTheme.size.xs};
    text-align: left;
    color: inherit;
    border: none;
    border-radius: 0;
    background: transparent;
  `;
}
