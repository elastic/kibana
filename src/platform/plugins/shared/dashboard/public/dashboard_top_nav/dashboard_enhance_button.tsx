/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent as ReactMouseEvent } from 'react';
import React from 'react';
import { useCurrentEuiBreakpoint } from '@elastic/eui';
import type { AppHeaderExperimentalDashboardAiAction } from '@kbn/app-header';
import { useCurrentChromeApplicationBreakpoint } from '@kbn/core-chrome-layout-utils';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/ui-ai-components';

const ENHANCE_LABEL = i18n.translate('dashboard.topNav.enhanceButtonLabel', {
  defaultMessage: 'Enhance',
});

export const DashboardEnhanceButton = ({
  action,
}: {
  action: AppHeaderExperimentalDashboardAiAction;
}) => {
  const applicationBreakpoint = useCurrentChromeApplicationBreakpoint();
  const viewportBreakpoint = useCurrentEuiBreakpoint();
  const breakpoint = applicationBreakpoint ?? viewportBreakpoint;
  const iconOnly = breakpoint !== 'm' && breakpoint !== 'l' && breakpoint !== 'xl';

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const triggerElement = event.currentTarget;
    action.onClick({
      returnFocus: () => triggerElement.focus(),
    });
  };

  if (iconOnly) {
    return (
      <AiButton
        iconOnly
        variant="empty"
        size="xs"
        iconType="sparkles"
        withToolTip
        aria-label={ENHANCE_LABEL}
        isDisabled={action.isDisabled}
        data-test-subj={action.testId ?? 'dashboardEnhanceButton'}
        onClick={handleClick}
      />
    );
  }

  return (
    <AiButton
      variant="empty"
      size="xs"
      iconType="sparkles"
      aria-label={ENHANCE_LABEL}
      isDisabled={action.isDisabled}
      data-test-subj={action.testId ?? 'dashboardEnhanceButton'}
      onClick={handleClick}
    >
      {ENHANCE_LABEL}
    </AiButton>
  );
};
