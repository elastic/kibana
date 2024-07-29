/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiButtonEmpty, EuiPopover, EuiPopoverFooter, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DashboardAPI } from '../..';

interface ManagedPopoverProps {
  text: string;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (isPopoverOpen: boolean) => void;
  dashboard: DashboardAPI;
}

export const ManagedPopover = ({
  text,
  setIsPopoverOpen,
  isPopoverOpen,
  dashboard,
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
        {i18n.translate('managedContentBadge.text', {
          defaultMessage: 'Managed',
        })}
      </EuiText>
    </EuiButton>
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={() => setIsPopoverOpen(false)}>
      <EuiText size="s">{text}</EuiText>
      <EuiPopoverFooter>
        <EuiButtonEmpty
          size="xs"
          onClick={() => {
            dashboard.duplicate();
          }}
        >
          <EuiText size="s">
            {i18n.translate('managedContentPopoverFooterText', {
              defaultMessage: 'Duplicate this dashboard',
            })}
          </EuiText>
        </EuiButtonEmpty>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
