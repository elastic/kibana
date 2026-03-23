/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ExportShareDerivatives } from '@kbn/share-plugin/public';
import type { ShareContext } from '@kbn/share-plugin/public/types';

import type { DashboardState } from '../../server';
import { ExportSourceFlyout } from './export_source_flyout';

export interface ExportSourceSharingData {
  title: string;
  exportSource: () => DashboardState;
}

export const getShareMenuItems =
  () =>
  (
    _ctx: ShareContext
  ): ReturnType<ExportShareDerivatives['config']> extends Promise<infer R> ? R : never => {
    return {
      label: ({ openFlyout }) => (
        <EuiButtonEmpty
          size="s"
          iconType="code"
          onClick={openFlyout}
          data-test-subj="exportMenuItem-JSON"
        >
          {i18n.translate('dashboard.exportSource.label', {
            defaultMessage: 'JSON',
          })}
        </EuiButtonEmpty>
      ),
      shouldRender: () => true,
      flyoutSizing: {
        size: 'm',
        maxWidth: 1000,
      },
      flyoutContent: ({ closeFlyout }) => <ExportSourceFlyout closeFlyout={closeFlyout} />,
    };
  };
