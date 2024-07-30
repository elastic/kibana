/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { DashboardAPI } from '../..';
import { DashboardRedirect } from '../../dashboard_container/types';
import { dashboardManagedBadge } from '../_dashboard_app_strings';

interface ManagedPopoverProps {
  dashboard: DashboardAPI;
  redirectTo: DashboardRedirect;
}

export const ManagedPopover = ({ dashboard, redirectTo }: ManagedPopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const text = dashboardManagedBadge.getText();
  const buttonText = i18n.translate('dashboard.managedContentPopoverFooterText', {
    defaultMessage: 'Duplicate this dashboard',
  });
  const cancelButtonText = i18n.translate('dashboard.managedContentPopoverFooterCancelText', {
    defaultMessage: 'Cancel',
  });

  const button = (
    <EuiButton
      color="primary"
      iconType="glasses"
      fill
      size="s"
      aria-label={i18n.translate('dashboard.managedContentBadge.text', {
        defaultMessage: 'Managed',
      })}
      onClick={() => {
        setIsPopoverOpen(!isPopoverOpen);
      }}
    >
      <EuiText size="s">
        {i18n.translate('dashboard.managedContentBadge.text', {
          defaultMessage: 'Managed',
        })}
      </EuiText>
    </EuiButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      className="eui-hideFor--s eui-hideFor--xs"
      data-test-subj="managedContentPopover"
    >
      <EuiFlexItem>
        <EuiText
          size="s"
          aria-label={text}
          css={css`
            max-width: 300px;
          `}
        >
          {text}
        </EuiText>
      </EuiFlexItem>
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              size="s"
              disabled={isLoading}
              fill
              aria-label={buttonText}
              onClick={() => {
                setIsLoading(true);
                dashboard.duplicate(redirectTo);
                setIsLoading(false);
              }}
              data-test-subj="managedContentPopoverDuplicateButton"
            >
              {isLoading && <EuiLoadingSpinner size="m" />}
              <EuiText size="s">{buttonText}</EuiText>
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty aria-label={cancelButtonText} onClick={() => setIsPopoverOpen(false)}>
              <EuiText size="s">{cancelButtonText}</EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
