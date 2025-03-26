/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiPopover,
  useGeneratedHtmlId,
  EuiSelectableOption,
  EuiSelectable,
  EuiPopoverTitle,
  EuiHorizontalRule,
} from '@elastic/eui';

export const TabsBarMenu = () => {
  const [activeTabs, setActiveTabs] = useState<EuiSelectableOption[]>([
    {
      label: 'Untitled session 1',
      checked: 'on',
    },
    {
      label: 'Untitled session 2',
    },
    {
      label: 'Untitled session 3',
    },
  ]);
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<EuiSelectableOption[]>([
    {
      label: 'Session 4',
    },
    {
      label: 'Session 5',
    },
    {
      label: 'Session 6',
    },
  ]);
  const [isPopoverOpen, setPopover] = useState(false);
  const contextMenuPopoverId = useGeneratedHtmlId();

  const menuButtonLabel = i18n.translate('unifiedTabs.tabsBarMenuButton', {
    defaultMessage: 'Tabs bar menu',
  });

  const closePopover = useCallback(() => {
    setPopover(false);
  }, [setPopover]);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      hasArrow={false}
      button={
        <EuiButtonIcon
          aria-label={menuButtonLabel}
          title={menuButtonLabel}
          color="text"
          data-test-subj="unifiedTabs_tabsBarMenuButton"
          iconType="boxesVertical"
          onClick={() => setPopover((prev) => !prev)}
        />
      }
    >
      <EuiSelectable
        aria-label="Single selection example"
        options={activeTabs}
        onChange={(newOptions) => setActiveTabs(newOptions)} // TODO navigate to selected tab
        singleSelection="always"
        css={css`
          width: 240px;
        `}
      >
        {(tabs) => (
          <>
            <EuiPopoverTitle paddingSize="s">Opened tabs</EuiPopoverTitle>
            {tabs}
          </>
        )}
      </EuiSelectable>
      <EuiHorizontalRule margin="none" />
      <EuiSelectable
        aria-label="Single selection example"
        options={recentlyClosedTabs}
        onChange={() => {
          console.log('restore tab'); // TODO restore closet tab0
        }}
        singleSelection={true}
        css={css`
          width: 240px;
        `}
      >
        {(tabs) => (
          <>
            <EuiPopoverTitle paddingSize="s">Recently closed</EuiPopoverTitle>
            {tabs}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
