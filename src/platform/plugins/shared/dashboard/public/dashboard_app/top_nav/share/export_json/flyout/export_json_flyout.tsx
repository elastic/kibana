/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import { EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { ExportJsonFlyoutContent } from '@kbn/as-code-export-flyout-component';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { KbnInfoCallout } from '@kbn/ui-callout';

import { DASHBOARD_API_PATH } from '../../../../../../common';
import type { DashboardSanitizeResponseBody } from '../../../../../../server';
import { coreServices, shareService } from '../../../../../services/kibana_services';

/** Builds a Console request that creates a new dashboard from the exported panel or panels. */
const getCreateDashboardRequest = (jsonValue: string): string => {
  const exported = JSON.parse(jsonValue);
  const body = {
    title: i18n.translate('dashboard.exportJson.openInConsoleDashboardTitle', {
      defaultMessage: 'New dashboard',
    }),
    panels: Array.isArray(exported) ? exported : [exported],
  };
  return `POST kbn:${DASHBOARD_API_PATH}\n${JSON.stringify(body, null, 2)}`;
};

export const DashboardPanelExportJsonFlyout = <State extends object, PreparedState extends object>({
  title,
  objectType,
  closeFlyout,
  getExportJson,
  isByReference,
  panelCount = 1,
  sanitizeState,
  titleId,
}: {
  title: string;
  objectType: string;
  closeFlyout: () => void;
  getExportJson: (forceExportByValue?: boolean) => State;
  /** Whether at least one of the exported panels is linked to the library */
  isByReference: boolean;
  panelCount?: number;
  sanitizeState: (state: State) => Promise<{
    data: PreparedState | undefined;
    warnings: NonNullable<DashboardSanitizeResponseBody['warnings']>;
  }>;
  titleId: string;
}) => {
  const [forceExportByValue, setForceExportByValue] = useState(false);
  const showFullConfigurationLabel = i18n.translate('dashboard.exportJson.showFullConfigSwitch', {
    defaultMessage: 'Show full configuration',
  });

  const getSelectedExportJson = useCallback(
    () => getExportJson(forceExportByValue),
    [forceExportByValue, getExportJson]
  );

  const prepareExportJson = useCallback(
    async (state: State) => {
      const result = await sanitizeState(state);
      return {
        data: result.data,
        warnings: result.warnings.map(({ message }) => message),
      };
    },
    [sanitizeState]
  );

  return (
    <ExportJsonFlyoutContent<State, PreparedState>
      title={title}
      objectType={objectType}
      closeFlyout={closeFlyout}
      dataTestSubjPrefix="dashboard"
      downloadExportJson={(filename: string, content: string) =>
        downloadFileAs(filename, { content, type: 'application/json' })
      }
      getExportJson={getSelectedExportJson}
      headerActions={
        isByReference ? (
          <EuiSwitch
            compressed
            label={showFullConfigurationLabel}
            checked={forceExportByValue}
            onChange={() => setForceExportByValue(!forceExportByValue)}
          />
        ) : undefined
      }
      headerNotice={
        <>
          <EuiText size="s" color="subdued" data-test-subj="dashboardPanelExportJsonImportHint">
            <p>
              <FormattedMessage
                id="dashboard.exportJson.importHint"
                defaultMessage="To add {panelCount, plural, one {this panel} other {these panels}} to another dashboard, copy this JSON and paste it in {addLabel} > {fromJsonLabel}."
                values={{
                  panelCount,
                  addLabel: (
                    <strong>
                      {i18n.translate('dashboard.exportJson.importHint.addLabel', {
                        defaultMessage: 'Add',
                      })}
                    </strong>
                  ),
                  fromJsonLabel: (
                    <strong>
                      {i18n.translate('dashboard.exportJson.importHint.fromJsonLabel', {
                        defaultMessage: 'From JSON',
                      })}
                    </strong>
                  ),
                }}
              />
            </p>
          </EuiText>
          {isByReference && !forceExportByValue && (
            <>
              <EuiSpacer size="s" />
              <KbnInfoCallout
                announceOnMount
                title={i18n.translate('dashboard.exportJson.linkedToLibraryCalloutTitle', {
                  defaultMessage: 'Linked to library',
                })}
                text={
                  panelCount > 1 ? (
                    <FormattedMessage
                      id="dashboard.exportJson.showFullConfigCalloutForPanels"
                      defaultMessage="Some of these panels are linked to the library, so this dashboard stores only references to them. Select {buttonLabel} to see their complete definitions."
                      values={{
                        buttonLabel: <i>{showFullConfigurationLabel}</i>,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="dashboard.exportJson.showFullConfigCallout"
                      defaultMessage="This panel is linked to the library, so this dashboard stores only a reference to it. Select {buttonLabel} to see its complete definition."
                      values={{
                        buttonLabel: <i>{showFullConfigurationLabel}</i>,
                      }}
                    />
                  )
                }
              />
            </>
          )}
        </>
      }
      openInConsole={{
        canShow: Boolean(coreServices.application?.capabilities?.dev_tools?.show),
        getRequest: getCreateDashboardRequest,
        useUrl: shareService?.url.locators.useUrl,
      }}
      prepareExportJson={prepareExportJson}
      titleId={titleId}
    />
  );
};
