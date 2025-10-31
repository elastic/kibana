/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiButtonIconProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CascadeRowActionProps } from '../../types';
import { styles as cascadeRowActionsStyles } from './cascade_row_actions.styles';

const MAX_ACTIONS_VISIBLE = 2;

export const CascadeRowActions = function RowActions({
  headerRowActions,
  maxActionCount = MAX_ACTIONS_VISIBLE,
}: CascadeRowActionProps) {
  const { euiTheme } = useEuiTheme();

  const id = useGeneratedHtmlId({
    prefix: 'dataCascadeRowActions',
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const styles = useMemo(() => cascadeRowActionsStyles(euiTheme), [euiTheme]);

  const defaultActionProps = useMemo<Pick<EuiButtonIconProps, 'color' | 'size'>>(
    () => ({
      color: 'text',
      size: 's',
    }),
    []
  );

  const hiddenActionsButton = useMemo(
    () => (
      <EuiButtonIcon
        {...defaultActionProps}
        aria-label={i18n.translate(
          'sharedUXPackages.dataCascade.expandRowButtonLabel.more_options',
          {
            defaultMessage: 'Select more options',
          }
        )}
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        iconType="boxesVertical"
        data-test-subj={`expand-row-${id}-button`}
      />
    ),
    [defaultActionProps, id, isPopoverOpen]
  );

  const visibleActions = useMemo(
    () =>
      headerRowActions.slice(0, maxActionCount).map(({ label, ...props }, index) => (
        <EuiFlexItem key={index} grow={false}>
          {label ? (
            <EuiButtonEmpty {...defaultActionProps} {...props}>
              {label}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonIcon {...defaultActionProps} {...props} />
          )}
        </EuiFlexItem>
      )),
    [defaultActionProps, headerRowActions, maxActionCount]
  );

  const hiddenActions = useMemo(
    () =>
      headerRowActions.slice(maxActionCount).map(({ label, iconType, ...props }, index) => (
        <EuiContextMenuItem key={index} icon={iconType} {...props}>
          {label}
        </EuiContextMenuItem>
      )),
    [headerRowActions, maxActionCount]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" css={styles.cascadeRowActions}>
      <>{visibleActions}</>
      {headerRowActions.length > maxActionCount && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            button={hiddenActionsButton}
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel size="m" items={hiddenActions} />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
