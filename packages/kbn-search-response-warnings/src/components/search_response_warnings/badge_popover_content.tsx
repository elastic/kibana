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
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsBadgePopoverContent = (props: Props) => {
  const [openPanel, setOpenPanel] = useState(WARNING_PANEL_ID);

  const requestNameMap = new Map<string, number>();
  return (
    <div className="euiContextMenu">
      {openPanel === VIEW_DETAILS_PANEL_ID ? (
        <EuiContextMenuPanel
          items={props.warnings.map((warning) => {
            const count = requestNameMap.has(warning.requestName)
              ? requestNameMap.get(warning.requestName)! + 1
              : 1;
            const uniqueRequestName =
              count > 1 ? `${warning.requestName} (${count})` : warning.requestName;
            requestNameMap.set(warning.requestName, count);
            return (
              <EuiContextMenuItem
                key={uniqueRequestName}
                onClick={() => {
                  props.onViewDetailsClick?.();
                  warning.openInInspector();
                }}
              >
                {uniqueRequestName}
              </EuiContextMenuItem>
            );
          })}
          onClose={() => {
            setOpenPanel(WARNING_PANEL_ID);
          }}
          title={viewDetailsLabel}
        />
      ) : (
        <EuiContextMenuPanel title={getWarningsTitle(props.warnings)}>
          <EuiPanel color="transparent" paddingSize="s">
            <EuiText size="s">{getWarningsDescription(props.warnings)}</EuiText>
            <EuiButtonEmpty
              color="primary"
              flush="left"
              iconSide={props.warnings.length > 1 ? 'right' : undefined}
              iconType={props.warnings.length > 1 ? 'arrowRight' : undefined}
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
        </EuiContextMenuPanel>
      )}
    </div>
  );
};
