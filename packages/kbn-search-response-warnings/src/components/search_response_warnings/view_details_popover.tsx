/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiLink,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { viewDetailsLabel } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

interface Props {
  displayAsLink?: boolean;
  warnings: SearchResponseWarning[];
}

export const ViewDetailsPopover = (props: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!props.warnings.length) {
    return null;
  }

  if (props.warnings.length === 1) {
    return props.displayAsLink ? (
      <EuiLink color="primary" onClick={props.warnings[0].openInInspector}>
        {viewDetailsLabel}
      </EuiLink>
    ) : (
      <EuiButton color="primary" onClick={props.warnings[0].openInInspector}>
        {viewDetailsLabel}
      </EuiButton>
    );
  }

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: props.warnings.map((warning) => {
        return {
          name: warning.requestName,
          onClick: () => {
            setIsPopoverOpen(false);
            warning.openInInspector();
          },
        };
      }),
    },
  ];

  return (
    <EuiPopover
      id="ViewDetailsPopover"
      button={
        props.displayAsLink ? (
          <EuiLink color="primary" onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
            <>
              {viewDetailsLabel} <EuiIcon type="arrowRight" size="s" />
            </>
          </EuiLink>
        ) : (
          <EuiButton
            color="primary"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            iconSide="right"
            iconType="arrowRight"
          >
            {viewDetailsLabel}
          </EuiButton>
        )
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
