/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';

import { DashboardRedirect } from '../types';

export const Dashboard404Page = ({
  dashboardRedirect,
}: {
  dashboardRedirect?: DashboardRedirect;
}) => {
  return (
    <NotFoundPrompt
      title={i18n.translate('dashboard.renderer.404Title', {
        defaultMessage: 'Dashboard not found',
      })}
      body={i18n.translate('dashboard.renderer.404Body', {
        defaultMessage:
          "Sorry, the dashboard you're looking for can't be found. It might have been removed or renamed, or maybe it never existed at all.",
      })}
      actions={
        dashboardRedirect
          ? [
              <EuiButtonEmpty
                iconType="arrowLeft"
                flush="both"
                onClick={() => dashboardRedirect({ destination: 'listing' })}
              >
                {i18n.translate('dashboard.renderer.404Action', {
                  defaultMessage: 'View available dashboards',
                })}
              </EuiButtonEmpty>,
            ]
          : undefined // if dashboard redirect not given, fall back to `go back`.
      }
    />
  );
};
