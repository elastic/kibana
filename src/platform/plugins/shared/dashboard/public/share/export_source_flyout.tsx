/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadFileAs, useShareTypeContext } from '@kbn/share-plugin/public';

import type { ExportSourceLoadState } from './export_source_asset_panel';
import { ExportSourceAssetPanel } from './export_source_asset_panel';
import { buildExportSourceFilename } from './export_source_share_utils';
import type { ExportSourceSharingData } from './json_export_config';

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

export const ExportSourceFlyout = ({ closeFlyout }: { closeFlyout: () => void }) => {
  const { objectType, objectTypeAlias, sharingData } = useShareTypeContext(
    'integration',
    'exportDerivatives'
  );

  const typedSharingData = sharingData as unknown as ExportSourceSharingData;

  const [dashboardState] = useState(() => typedSharingData.exportSource());
  const [loadState, setLoadState] = useState<ExportSourceLoadState>({ status: 'loading' });

  const onDownload = useCallback(async () => {
    if (loadState.status !== 'success') return;

    const filename = buildExportSourceFilename(typedSharingData.title, '.json');
    const content = JSON.stringify(loadState.data, null, 2);
    await downloadFileAs(filename, { content, type: 'application/json' });
    closeFlyout();
  }, [closeFlyout, loadState, typedSharingData.title]);

  return (
    <React.Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="share.export.flyoutTitle"
              defaultMessage="Export {objectType} as {type}"
              values={{
                objectType: objectTypeAlias ?? objectType.toLocaleLowerCase(),
                type: i18n.translate('dashboard.exportSource.label', { defaultMessage: 'JSON' }),
              }}
            />
          </h2>
        </EuiTitle>
        <React.Fragment>
          <EuiSpacer size="s" />
          <EuiBetaBadge
            label={i18n.translate('dashboard.exportSource.technicalPreviewBadgeLabel', {
              defaultMessage: 'TECHNICAL PREVIEW',
            })}
            tooltipContent={i18n.translate('dashboard.exportSource.technicalPreviewBadgeTooltip', {
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
          <ExportSourceAssetPanel
            dashboardState={dashboardState}
            onLoadStateChange={setLoadState}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="exportFlyoutCloseButton" onClick={closeFlyout}>
              <FormattedMessage id="share.export.closeFlyoutButtonLabel" defaultMessage="Close" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onDownload}
              data-test-subj="generateReportButton"
              disabled={loadState.status !== 'success'}
            >
              {i18n.translate('dashboard.exportSource.downloadButtonLabel', {
                defaultMessage: 'Download JSON',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
};
