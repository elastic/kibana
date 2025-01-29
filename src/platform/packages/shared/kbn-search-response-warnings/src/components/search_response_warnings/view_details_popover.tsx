/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      <EuiLink
        color="primary"
        onClick={props.warnings[0].openInInspector}
        data-test-subj="searchResponseWarningsViewDetails"
      >
        {viewDetailsLabel}
      </EuiLink>
    ) : (
      <EuiButton
        color="primary"
        onClick={props.warnings[0].openInInspector}
        data-test-subj="searchResponseWarningsViewDetails"
      >
        {viewDetailsLabel}
      </EuiButton>
    );
  }

  const requestNameMap = new Map<string, number>();
  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: props.warnings.map((warning) => {
        const count = requestNameMap.has(warning.requestName)
          ? requestNameMap.get(warning.requestName)! + 1
          : 1;
        const uniqueRequestName =
          count > 1 ? `${warning.requestName} (${count})` : warning.requestName;
        requestNameMap.set(warning.requestName, count);
        return {
          name: uniqueRequestName,
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
          <EuiLink
            color="primary"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            data-test-subj="searchResponseWarningsViewDetails"
          >
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
            data-test-subj="searchResponseWarningsViewDetails"
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
      <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="viewDetailsContextMenu" />
    </EuiPopover>
  );
};
