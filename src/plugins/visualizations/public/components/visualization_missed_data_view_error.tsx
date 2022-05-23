/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { ApplicationStart } from '@kbn/core/public';
import type { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import type { ViewMode } from '@kbn/embeddable-plugin/common';
import type { RenderMode } from '@kbn/expressions-plugin';

interface VisualizationMissedDataViewErrorProps {
  error: SavedObjectNotFound;
  application: ApplicationStart;
  viewMode: ViewMode;
  renderMode: RenderMode;
}

export const VisualizationMissedDataViewError = ({
  error,
  application,
  viewMode,
  renderMode,
}: VisualizationMissedDataViewErrorProps) => {
  const { management: isManagementEnabled } = application.capabilities.navLinks;
  const isIndexPatternManagementEnabled = application.capabilities.management.kibana.indexPatterns;
  const isEditVisEnabled = application.capabilities.visualize?.save;

  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="danger"
      data-test-subj="visualization-missed-data-view-error"
      actions={
        renderMode === 'edit' && isManagementEnabled && isIndexPatternManagementEnabled ? (
          <RedirectAppLinks navigateToUrl={application.navigateToUrl}>
            <a
              href={application.getUrlForApp('management', {
                path: '/kibana/indexPatterns/create',
              })}
              data-test-subj="configuration-failure-reconfigure-indexpatterns"
            >
              {i18n.translate('visualizations.missedDataView.dataViewReconfigure', {
                defaultMessage: `Recreate it in the data view management page`,
              })}
            </a>
          </RedirectAppLinks>
        ) : null
      }
      body={
        <>
          <p>
            {i18n.translate('visualizations.missedDataView.errorMessage', {
              defaultMessage: `Could not find the data view: {id}`,
              values: {
                id: error.savedObjectId,
              },
            })}
          </p>
          {viewMode === 'edit' && renderMode !== 'edit' && isEditVisEnabled ? (
            <p>
              {i18n.translate('visualizations.missedDataView.editInVisualizeEditor', {
                defaultMessage: `Edit in Visualize editor to fix the error`,
              })}
            </p>
          ) : null}
        </>
      }
    />
  );
};
