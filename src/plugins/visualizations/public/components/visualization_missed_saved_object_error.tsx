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
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-plugin/common';
import type { ViewMode } from '@kbn/embeddable-plugin/common';
import type { RenderMode } from '@kbn/expressions-plugin';

interface VisualizationMissedSavedObjectErrorProps {
  savedObjectMeta: {
    savedObjectType: typeof DATA_VIEW_SAVED_OBJECT_TYPE | 'search';
    savedObjectId?: string;
  };
  application: ApplicationStart;
  viewMode: ViewMode;
  renderMode: RenderMode;
}

export const VisualizationMissedSavedObjectError = ({
  savedObjectMeta,
  application,
  viewMode,
  renderMode,
}: VisualizationMissedSavedObjectErrorProps) => {
  const { management: isManagementEnabled } = application.capabilities.navLinks;
  const isIndexPatternManagementEnabled = application.capabilities.management.kibana.indexPatterns;
  const isEditVisEnabled = application.capabilities.visualize?.save;

  return (
    <EuiEmptyPrompt
      iconType="alert"
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
              defaultMessage: `Could not find the {type}: {id}`,
              values: {
                id: savedObjectMeta.savedObjectId ?? '-',
                type:
                  savedObjectMeta.savedObjectType === 'search'
                    ? i18n.translate('visualizations.noSearch.label', {
                        defaultMessage: 'search',
                      })
                    : i18n.translate('visualizations.noDataView.label', {
                        defaultMessage: 'data view',
                      }),
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
