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
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { getWarningsDescription, getWarningsTitle, viewDetailsLabel } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

const WARNING_PANEL_ID = 0;
const VIEW_DETAILS_PANEL_ID = 1;

interface Props {
  onViewDetailsClick?: () => void;
  visualizationLabel?: string;
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsBadgePopoverContent = (props: Props) => {
  const [openPanel, setOpenPanel] = useState(WARNING_PANEL_ID);
  return openPanel === VIEW_DETAILS_PANEL_ID
    ? <EuiContextMenuPanel
        items={props.warnings.map(warning => {
          return (
            <EuiContextMenuItem
              key={warning.requestName}
              onClick={() => {
                props.onViewDetailsClick?.();
                warning.openInInspector();
              }}
            >
              {warning.requestName}
            </EuiContextMenuItem>
          );
        })}
        onClose={() => {
          setOpenPanel(WARNING_PANEL_ID);
        }}
        title={viewDetailsLabel}
      />
    : <EuiContextMenuPanel title={getWarningsTitle(props.warnings)}>
        <EuiPanel color="transparent" paddingSize="s">
          <EuiText size="s">
            {getWarningsDescription(props.warnings, props.visualizationLabel)}
          </EuiText>
          <EuiButtonEmpty
            color="primary"
            iconSide={props.warnings.length > 1 ? "right" : undefined}
            iconType={props.warnings.length > 1 ? "arrowRight" : undefined}
            onClick={() => {
              if (props.warnings.length > 1) {
                setOpenPanel(VIEW_DETAILS_PANEL_ID);
              } else {
                props.onViewDetailsClick?.();
                props.warnings[0].openInInspector();
              }
            }}
          >
            {viewDetailsLabel}
          </EuiButtonEmpty>
        </EuiPanel>
      </EuiContextMenuPanel>;
};
