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
import React from 'react';
import { DashboardAPI } from '../..';
import { DashboardRedirect } from '../../dashboard_container/types';

interface ManagedPopoverProps {
  text: string;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (isPopoverOpen: boolean) => void;
  dashboard: DashboardAPI;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  redirectTo: DashboardRedirect;
}

export const ManagedPopover = ({
  text,
  setIsPopoverOpen,
  isPopoverOpen,
  dashboard,
  isLoading,
  setIsLoading,
  redirectTo,
}: ManagedPopoverProps) => {
  const button = (
    <EuiButton
      color="primary"
      iconType="glasses"
      fill
      size="s"
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
        <EuiText size="s">{text}</EuiText>
      </EuiFlexItem>
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButton
            color="primary"
            size="s"
            disabled={isLoading}
            fill
            onClick={() => {
              setIsLoading(true);
              dashboard.duplicate(redirectTo);
              setIsLoading(false);
            }}
            data-test-subj="managedContentPopoverDuplicateButton"
          >
            {isLoading && <EuiLoadingSpinner size="m" />}
            <EuiText size="s">
              {i18n.translate('dashboard.managedContentPopoverFooterText', {
                defaultMessage: 'Duplicate this dashboard',
              })}
            </EuiText>
          </EuiButton>
          <EuiButtonEmpty onClick={() => setIsPopoverOpen(false)}>
            <EuiText size="s">
              {i18n.translate('dashboard.managedContentPopoverFooterCancelText', {
                defaultMessage: 'Cancel',
              })}
            </EuiText>
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
