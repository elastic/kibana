/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GroupNode } from '../../../../store_provider';
import type { CascadeRowActionProps } from '../../types';

export function CascadeRowActions<G extends GroupNode>({
  rowHeaderActions,
  rowInstance,
  hideOver = 2,
}: CascadeRowActionProps<G>) {
  const actions = useMemo(
    () => rowHeaderActions?.({ row: rowInstance }) || [],
    [rowHeaderActions, rowInstance]
  );

  return (
    <EuiFlexGroup alignItems="center" key="cascade-row-actions">
      <React.Fragment>
        {actions.slice(0, hideOver).map((action, index) => (
          <EuiFlexItem key={index}>{action}</EuiFlexItem>
        ))}
      </React.Fragment>
      {actions.length > hideOver && (
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'sharedUXPackages.dataCascade.expandRowButtonLabel.more_options',
                  {
                    defaultMessage: 'Select More options',
                  }
                )}
                iconType="boxesVertical"
                data-test-subj={`expand-row-${rowInstance.id}-button`}
              />
            }
          >
            <EuiContextMenuPanel
              items={actions.slice(hideOver).map((action, index) => (
                <EuiContextMenuPanel key={index}>{action}</EuiContextMenuPanel>
              ))}
            />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
