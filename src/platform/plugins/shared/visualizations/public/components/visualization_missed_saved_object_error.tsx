/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { ApplicationStart } from '@kbn/core/public';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-plugin/common';
import type { RenderMode } from '@kbn/expressions-plugin/common';

interface VisualizationMissedSavedObjectErrorProps {
  savedObjectMeta: {
    savedObjectType: typeof DATA_VIEW_SAVED_OBJECT_TYPE | 'search';
  };
  application: ApplicationStart;
  message: string;
  renderMode: RenderMode;
}

export const VisualizationMissedSavedObjectError = ({
  savedObjectMeta,
  application,
  message,
  renderMode,
}: VisualizationMissedSavedObjectErrorProps) => {
  const { management: isManagementEnabled } = application.capabilities.navLinks;
  const isIndexPatternManagementEnabled = application.capabilities.management.kibana.indexPatterns;

  return (
    <EuiEmptyPrompt
      iconType="warning"
      iconColor="danger"
      data-test-subj="visualization-missed-data-view-error"
      actions={
        savedObjectMeta.savedObjectType === DATA_VIEW_SAVED_OBJECT_TYPE &&
        renderMode === 'edit' &&
        isManagementEnabled &&
        isIndexPatternManagementEnabled ? (
          <RedirectAppLinks navigateToUrl={application.navigateToUrl}>
            <a
              href={application.getUrlForApp('management', {
                path: '/kibana/indexPatterns/create',
              })}
              data-test-subj="configuration-failure-reconfigure-indexpatterns"
              css={{ width: '100%' }}
            >
              {i18n.translate('visualizations.missedDataView.dataViewReconfigure', {
                defaultMessage: `Recreate it in the data view management page`,
              })}
            </a>
          </RedirectAppLinks>
        ) : null
      }
      body={<p>{message}</p>}
    />
  );
};
