/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  euiFullHeight,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadFileAs } from '@kbn/share-plugin/public';

import { ExportJsonPanel } from './export_json_panel';
import { buildExportJsonFilename } from '../export_json_share_utils';
import type { ExportJsonSharingData, SanitizeStateFunction } from './types';
import { useSanitizedState } from './use_sanitized_state';

const flyoutBodyCss = css`
  ${euiFullHeight()}
  .euiFlyoutBody__overflow {
    ${euiFullHeight()}
    min-height: 0;
  }

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
    min-height: 0;
  }
`;

type NoSanitizedState = void & {};

export const ExportJsonFlyout = <
  State extends object,
  SanitizedState extends object = NoSanitizedState
>({
  title,
  objectType,
  closeFlyout,
  getExportJson,
  isByReference = false,
  apiPath,
  sanitizeState,
}: ExportJsonSharingData<State> & {
  isByReference?: boolean;
  objectType: string;
  closeFlyout: () => void;
  apiPath?: string; // if provided, the "Open in Console" button is shown
  sanitizeState: SanitizeStateFunction<State, SanitizedState>;
}) => {
  const [forceExportByValue, setForceExportByValue] = useState<boolean>(false);
  const state = useMemo(
    () => getExportJson(forceExportByValue),
    [getExportJson, forceExportByValue]
  );

  const { status, data, warnings, error, retry } = useSanitizedState<State, SanitizedState>({
    state,
    sanitizeState,
  });

  const onDownload = useCallback(async () => {
    if (status !== 'success' || data === undefined) return;

    const filename = buildExportJsonFilename(title, '.json');
    const content = JSON.stringify(data, null, 2);
    await downloadFileAs(filename, { content, type: 'application/json' });
    closeFlyout();
  }, [closeFlyout, data, status, title]);

  return (
    <React.Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="dashboard.exportJson.flyoutTitle"
              defaultMessage="Export {objectType} as {type}"
              values={{
                objectType: objectType.toLocaleLowerCase(),
                type: i18n.translate('dashboard.exportJson.label', { defaultMessage: 'JSON' }),
              }}
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('dashboard.exportJson.technicalPreviewBadgeLabel', {
                defaultMessage: 'TECHNICAL PREVIEW',
              })}
              tooltipContent={i18n.translate('dashboard.exportJson.technicalPreviewBadgeTooltip', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              })}
              size="s"
              data-test-subj="dashboardExportJsonTechnicalPreviewBadge"
            />
          </EuiFlexItem>
          {isByReference && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={i18n.translate('dashboard.exportJson.showFullConfigSwitch', {
                  defaultMessage: 'Show full configuration',
                })}
                checked={forceExportByValue}
                onChange={() => setForceExportByValue(!forceExportByValue)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {isByReference && !forceExportByValue && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut announceOnMount>
              <FormattedMessage
                id="dashboard.exportJson.showFullConfigCallout"
                defaultMessage="This panel is linked to the library, so this dashboard stores only a reference to it. Select {buttonLabel} to see its complete definition."
                values={{
                  buttonLabel: (
                    <i>
                      {i18n.translate('dashboard.exportJson.showFullConfigSwitch', {
                        defaultMessage: 'Show full configuration',
                      })}
                    </i>
                  ),
                }}
              />
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="exportItemDetailsFlyoutBody" css={flyoutBodyCss}>
        <EuiFlexGroup css={{ height: '100%' }} direction="column">
          <ExportJsonPanel
            apiPath={apiPath}
            status={status}
            data={data}
            warnings={warnings}
            error={error}
            onRetry={retry}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="exportFlyoutCloseButton" onClick={closeFlyout}>
              <FormattedMessage
                id="dashboard.exportJson.closeFlyoutButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onDownload}
              data-test-subj="generateReportButton"
              disabled={status !== 'success' || data === undefined}
            >
              {i18n.translate('dashboard.exportJson.downloadButtonLabel', {
                defaultMessage: 'Download JSON',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
};
