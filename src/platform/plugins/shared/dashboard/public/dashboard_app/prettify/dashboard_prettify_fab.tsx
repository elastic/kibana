/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { debounceTime } from 'rxjs';
import type { DashboardApi, DashboardInternalApi } from '../../dashboard_api/types';
import { uiActionsService } from '../../services/kibana_services';
import {
  OPEN_DASHBOARD_PRETTIFY_ACTION_ID,
  type OpenDashboardPrettifyActionContext,
} from './dashboard_prettify_action';

const prettifyButtonLabel = i18n.translate('dashboard.prettifyFab.buttonLabel', {
  defaultMessage: 'Prettify',
});

export const DashboardPrettifyFab = ({
  dashboardApi,
  dashboardInternalApi,
}: {
  dashboardApi: DashboardApi;
  dashboardInternalApi: DashboardInternalApi;
}) => {
  const viewMode = useStateFromPublishingSubject(dashboardApi.viewMode$);
  const [isVisible, setIsVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const styles = useMemoCss(fabStyles);

  useEffect(() => {
    if (!uiActionsService.hasAction(OPEN_DASHBOARD_PRETTIFY_ACTION_ID)) {
      setIsVisible(false);
      return;
    }

    let cancelled = false;

    const updateVisibility = async () => {
      try {
        const action = (await uiActionsService.getAction(
          OPEN_DASHBOARD_PRETTIFY_ACTION_ID
        )) as Action<OpenDashboardPrettifyActionContext>;
        const compatible = await action.isCompatible({
          dashboardApi,
          dashboardInternalApi,
          trigger: { id: OPEN_DASHBOARD_PRETTIFY_ACTION_ID },
        });
        if (!cancelled) {
          setIsVisible(compatible);
        }
      } catch {
        if (!cancelled) {
          setIsVisible(false);
        }
      }
    };

    updateVisibility();
    const subscription = dashboardApi.anyStateChange$
      .pipe(debounceTime(100))
      .subscribe(updateVisibility);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [dashboardApi, dashboardInternalApi, viewMode]);

  if (!isVisible) {
    return null;
  }

  return (
    <div css={styles.wrapper}>
      <EuiButton
        fill
        iconType="sparkles"
        isLoading={isCapturing}
        disabled={isCapturing}
        onClick={async () => {
          setIsCapturing(true);
          try {
            const action = (await uiActionsService.getAction(
              OPEN_DASHBOARD_PRETTIFY_ACTION_ID
            )) as Action<OpenDashboardPrettifyActionContext>;
            await action.execute({
              dashboardApi,
              dashboardInternalApi,
              trigger: { id: OPEN_DASHBOARD_PRETTIFY_ACTION_ID },
            });
          } finally {
            setIsCapturing(false);
          }
        }}
        data-test-subj="dashboardPrettifyButton"
      >
        {prettifyButtonLabel}
      </EuiButton>
    </div>
  );
};

const fabStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      zIndex: euiTheme.levels.header,
      bottom: euiTheme.size.xl,
      left: '50%',
      transform: 'translateX(-50%)',
    }),
};
