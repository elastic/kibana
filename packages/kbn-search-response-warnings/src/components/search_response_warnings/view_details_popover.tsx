/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { viewDetailsLabel } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

interface Props {
  warnings: SearchResponseWarning[];
}

export const ViewDetailsPopover = (props: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!props.warnings.length) {
    return null;
  }

  if (props.warnings.length === 1) {
    return (
      <EuiButtonEmpty
        color="primary"
        size="s"
        onClick={props.warnings[0].openInInspector}
      >
        {viewDetailsLabel}
      </EuiButtonEmpty>
    );
  }

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: props.warnings.map((warning) => {
        return {
          name: warning.requestName,
          onClick: () => { warning.openInInspector(); },
        };
      }),
    },
  ];

  return (
    <EuiPopover
      id="ViewDetailsPopover"
      button={
        <EuiButtonEmpty
          iconType="arrowDown"
          iconSide="right"
          color="primary"
          size="s"
          onClick={() => setIsPopoverOpen(true)}
        >
          {viewDetailsLabel}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};