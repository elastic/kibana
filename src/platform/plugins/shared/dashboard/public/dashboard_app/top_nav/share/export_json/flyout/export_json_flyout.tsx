/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import { EuiSwitch } from '@elastic/eui';
import { ExportJsonFlyoutContent } from '@kbn/as-code-export-flyout-component';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { KbnInfoCallout } from '@kbn/ui-callout';

import type { DashboardSanitizeResponseBody } from '../../../../../../server';

export const DashboardPanelExportJsonFlyout = <State extends object, PreparedState extends object>({
  title,
  objectType,
  closeFlyout,
  getExportJson,
  isByReference,
  sanitizeState,
  titleId,
}: {
  title: string;
  objectType: string;
  closeFlyout: () => void;
  getExportJson: (forceExportByValue?: boolean) => State;
  isByReference: boolean;
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
        isByReference && !forceExportByValue ? (
          <KbnInfoCallout
            announceOnMount
            title={i18n.translate('dashboard.exportJson.linkedToLibraryCalloutTitle', {
              defaultMessage: 'Linked to library',
            })}
            text={
              <FormattedMessage
                id="dashboard.exportJson.showFullConfigCallout"
                defaultMessage="This panel is linked to the library, so this dashboard stores only a reference to it. Select {buttonLabel} to see its complete definition."
                values={{
                  buttonLabel: <i>{showFullConfigurationLabel}</i>,
                }}
              />
            }
          />
        ) : undefined
      }
      isTechnicalPreview
      prepareExportJson={prepareExportJson}
      titleId={titleId}
    />
  );
};
