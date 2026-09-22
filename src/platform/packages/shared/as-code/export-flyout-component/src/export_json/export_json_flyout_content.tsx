/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';

import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  euiFullHeight,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ExportJsonPanel } from './export_json_panel';
import { buildExportJsonFilename } from './export_json_share_utils';
import type {
  DownloadExportJson,
  ExportJsonOpenInConsoleConfig,
  ExportJsonSharingData,
  PrepareExportJsonFunction,
} from './types';
import { usePreparedState } from './use_prepared_state';

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

type ExportJsonFlyoutContentProps<
  State extends object,
  PreparedState extends object
> = ExportJsonSharingData<State> & {
  objectType: string;
  closeFlyout: () => void;
  dataTestSubjPrefix: string;
  downloadExportJson: DownloadExportJson;
  /** Consumer-owned controls rendered beside the Technical Preview badge. */
  headerActions?: React.ReactNode;
  /** Consumer-owned content rendered below the header actions. */
  headerNotice?: React.ReactNode;
  isTechnicalPreview: boolean;
  openInConsole?: ExportJsonOpenInConsoleConfig;
  prepareExportJson: PrepareExportJsonFunction<State, PreparedState>;
  titleId?: string;
};

export const ExportJsonFlyoutContent = <
  State extends object,
  PreparedState extends object = State
>({
  title,
  objectType,
  closeFlyout,
  dataTestSubjPrefix,
  downloadExportJson,
  getExportJson,
  headerActions,
  headerNotice,
  isTechnicalPreview,
  openInConsole,
  prepareExportJson,
  titleId,
}: ExportJsonFlyoutContentProps<State, PreparedState>) => {
  const state = useMemo(() => getExportJson(), [getExportJson]);

  const { status, data, warnings, error, retry } = usePreparedState<State, PreparedState>({
    state,
    prepareExportJson,
  });

  const onDownload = useCallback(async () => {
    if (status !== 'success' || data === undefined) return;

    const filename = buildExportJsonFilename(title, '.json');
    const content = JSON.stringify(data, null, 2);
    await downloadExportJson(filename, content);
    closeFlyout();
  }, [closeFlyout, data, downloadExportJson, status, title]);

  return (
    <React.Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={titleId}>
            <FormattedMessage
              id="asCodeExport.exportJson.flyoutTitle"
              defaultMessage="Export {objectType} as {type}"
              values={{
                objectType: objectType.toLocaleLowerCase(),
                type: i18n.translate('asCodeExport.exportJson.label', {
                  defaultMessage: 'JSON',
                }),
              }}
            />
          </h2>
        </EuiTitle>
        {(isTechnicalPreview || headerActions) && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="spaceBetween">
              {isTechnicalPreview && (
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    label={i18n.translate('asCodeExport.exportJson.technicalPreviewBadgeLabel', {
                      defaultMessage: 'TECHNICAL PREVIEW',
                    })}
                    tooltipContent={i18n.translate(
                      'asCodeExport.exportJson.technicalPreviewBadgeTooltip',
                      {
                        defaultMessage:
                          'This functionality is experimental and not supported. It may change or be removed at any time.',
                      }
                    )}
                    size="s"
                    data-test-subj={`${dataTestSubjPrefix}ExportJsonTechnicalPreviewBadge`}
                  />
                </EuiFlexItem>
              )}
              {headerActions && <EuiFlexItem grow={false}>{headerActions}</EuiFlexItem>}
            </EuiFlexGroup>
          </>
        )}

        {headerNotice && (
          <>
            <EuiSpacer size="s" />
            {headerNotice}
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="exportItemDetailsFlyoutBody" css={flyoutBodyCss}>
        <EuiFlexGroup css={{ height: '100%' }} direction="column">
          <ExportJsonPanel
            dataTestSubjPrefix={dataTestSubjPrefix}
            status={status}
            data={data}
            warnings={warnings}
            error={error}
            onRetry={retry}
            openInConsole={openInConsole}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="exportFlyoutCloseButton" onClick={closeFlyout}>
              <FormattedMessage
                id="asCodeExport.exportJson.closeFlyoutButtonLabel"
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
              {i18n.translate('asCodeExport.exportJson.downloadButtonLabel', {
                defaultMessage: 'Download JSON',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
};
