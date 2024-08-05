/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiWrappingPopover,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { DashboardAPI } from '../..';
import { DashboardRedirect } from '../../dashboard_container/types';
import { buttonText, text } from '../_dashboard_app_strings';

interface ManagedPopoverProps {
  dashboard: DashboardAPI;
  redirectTo: DashboardRedirect;
  anchor: HTMLElement;
}

export const ManagedPopover = ({ dashboard, redirectTo, anchor }: ManagedPopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <EuiWrappingPopover
      button={anchor}
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
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          disabled={isLoading}
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
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiWrappingPopover>
  );
};
