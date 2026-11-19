/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { FindingsState } from '../findings_store';
import { HOUSEKEEPING_DESCRIPTION, HOUSEKEEPING_TITLE, RERUN_LABEL } from '../texts';
import { FindingsPanel } from './findings_panel';

interface HousekeepingPageProps {
  state: FindingsState;
  onRerun: () => void;
}

export const HousekeepingPage = ({ state, onRerun }: HousekeepingPageProps) => (
  <>
    <AppHeader
      title={HOUSEKEEPING_TITLE}
      description={HOUSEKEEPING_DESCRIPTION}
      spacing="bleed"
      menu={{
        primaryActionItem: {
          id: 'rerun',
          label: RERUN_LABEL,
          iconType: 'refresh',
          isLoading: state.isLoading,
          run: onRerun,
          testId: 'housekeepingPageRerun',
        },
      }}
    />
    <EuiSpacer size="l" />
    <FindingsPanel state={state} onRetry={onRerun} />
  </>
);
