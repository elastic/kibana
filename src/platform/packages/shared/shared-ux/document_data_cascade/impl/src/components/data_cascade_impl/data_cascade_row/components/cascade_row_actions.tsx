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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useGeneratedHtmlId,
  type EuiButtonIconProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CascadeRowActionProps } from '../../types';

export const CascadeRowActions = function RowActions({
  headerRowActions,
  hideOver = 2,
}: CascadeRowActionProps) {
  const id = useGeneratedHtmlId({
    prefix: 'dataCascadeRowActions',
  });

  const defaultActionProps = useMemo<Pick<EuiButtonIconProps, 'color' | 'size'>>(
    () => ({
      color: 'text',
      size: 's',
    }),
    []
  );

  const visibleActions = useMemo(
    () =>
      headerRowActions.slice(0, hideOver).map(({ label, ...props }, index) => (
        <EuiFlexItem key={index}>
          {label ? (
            <EuiButtonEmpty {...defaultActionProps} {...props}>
              {label}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonIcon {...defaultActionProps} {...props} />
          )}
        </EuiFlexItem>
      )),
    [defaultActionProps, headerRowActions, hideOver]
  );

  const hiddenActions = useMemo(
    () =>
      headerRowActions.slice(hideOver).map(({ label, ...props }, index) => (
        <EuiContextMenuPanel key={index}>
          {label ? (
            <EuiButtonEmpty {...defaultActionProps} {...props}>
              {label}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonIcon {...defaultActionProps} {...props} />
          )}
        </EuiContextMenuPanel>
      )),
    [defaultActionProps, headerRowActions, hideOver]
  );

  return (
    <EuiFlexGroup alignItems="center" key="cascade-row-actions">
      <React.Fragment>{visibleActions}</React.Fragment>
      {headerRowActions.length > hideOver && (
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiButtonIcon
                color="text"
                aria-label={i18n.translate(
                  'sharedUXPackages.dataCascade.expandRowButtonLabel.more_options',
                  {
                    defaultMessage: 'Select more options',
                  }
                )}
                iconType="boxesVertical"
                data-test-subj={`expand-row-${id}-button`}
              />
            }
          >
            <EuiContextMenuPanel items={hiddenActions} />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
