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
import { downloadFileAs, useShareTypeContext } from '@kbn/share-plugin/public';

import { ExportJsonPanel } from './export_json_panel';
import { buildExportJsonFilename } from './export_json_share_utils';
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

export const ExportJsonFlyout = <State extends object, SanitizedState extends object>({
  apiPath,
  closeFlyout,
  sanitizeState,
}: {
  apiPath: string;
  closeFlyout: () => void;
  sanitizeState: SanitizeStateFunction<State, SanitizedState>;
}) => {
  const [exportFullState, setExportFullState] = useState<boolean>(false);
  const { objectType, objectTypeAlias, sharingData } = useShareTypeContext(
    'integration',
    'exportDerivatives'
  );
  const typedSharingData = sharingData as unknown as ExportJsonSharingData<State>;
  const { title, exportJson, isByReference } = typedSharingData;
  const state = useMemo(() => exportJson(!exportFullState), [exportJson, exportFullState]);

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
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="asCode.exportJson.flyoutTitle"
                  defaultMessage="Export {objectType} as {type}"
                  values={{
                    objectType: objectTypeAlias ?? objectType.toLocaleLowerCase(),
                    type: i18n.translate('asCode.exportJson.label', { defaultMessage: 'JSON' }),
                  }}
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {isByReference && (
            <EuiFlexItem>
              <EuiSwitch
                label="View full state"
                checked={exportFullState}
                onChange={() => setExportFullState(!exportFullState)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <React.Fragment>
          <EuiSpacer size="s" />
          <EuiBetaBadge
            label={i18n.translate('asCode.exportJson.technicalPreviewBadgeLabel', {
              defaultMessage: 'TECHNICAL PREVIEW',
            })}
            tooltipContent={i18n.translate('asCode.exportJson.technicalPreviewBadgeTooltip', {
              defaultMessage:
                'This functionality is experimental and not supported. It may change or be removed at any time.',
            })}
            size="s"
            data-test-subj="dashboardExportJsonTechnicalPreviewBadge"
          />
        </React.Fragment>
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
                id="asCode.exportJson.closeFlyoutButtonLabel"
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
              {i18n.translate('asCode.exportJson.downloadButtonLabel', {
                defaultMessage: 'Download JSON',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
};
