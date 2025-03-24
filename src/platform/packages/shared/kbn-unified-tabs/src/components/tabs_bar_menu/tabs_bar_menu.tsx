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
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';

export const TabsBarMenu = () => {
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
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem key="closeAllTabs" onClick={() => {}}>
            test
          </EuiContextMenuItem>,
          <EuiContextMenuItem key="closeAllTabs2" onClick={() => {}}>
            test
          </EuiContextMenuItem>,
          <EuiContextMenuItem key="closeAllTabs3" onClick={() => {}}>
            test
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
