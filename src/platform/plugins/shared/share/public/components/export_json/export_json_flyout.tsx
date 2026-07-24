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

import { ExportJsonPanel } from './export_json_panel';
import { buildExportJsonFilename } from './build_export_json_filename';
import type { ExportJsonFlyoutProps } from './types';
import { useSanitizedState } from './use_sanitized_state';
import { downloadFileAs } from '../../lib/download_as';

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
  isTechnicalPreview = false,
  sanitizeState,
  renderAdditionalActions,
}: ExportJsonFlyoutProps<State, SanitizedState>) => {
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
              id="share.exportJson.flyoutTitle"
              defaultMessage="Export {objectType} as {type}"
              description="Flyout title. {objectType} is the kind of object being exported, for example 'dashboard' or 'Discover session'. {type} is the export format."
              values={{
                objectType: objectType.toLocaleLowerCase(),
                type: i18n.translate('share.exportJson.label', {
                  defaultMessage: 'JSON',
                  description: 'Name of the export format. Usually left untranslated.',
                }),
              }}
            />
          </h2>
        </EuiTitle>
        {(isTechnicalPreview || isByReference) && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent={isTechnicalPreview ? 'spaceBetween' : 'flexEnd'}>
              {isTechnicalPreview && (
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    label={i18n.translate('share.exportJson.technicalPreviewBadgeLabel', {
                      defaultMessage: 'TECHNICAL PREVIEW',
                      description:
                        'Badge marking the feature as not yet generally available. Displayed in uppercase.',
                    })}
                    tooltipContent={i18n.translate(
                      'share.exportJson.technicalPreviewBadgeTooltip',
                      {
                        defaultMessage:
                          'This functionality is experimental and not supported. It may change or be removed at any time.',
                        description: 'Tooltip explaining the technical preview badge.',
                      }
                    )}
                    size="s"
                    data-test-subj="exportJsonTechnicalPreviewBadge"
                  />
                </EuiFlexItem>
              )}
              {isByReference && (
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    compressed
                    label={i18n.translate('share.exportJson.showFullConfigSwitch', {
                      defaultMessage: 'Show full configuration',
                      description:
                        'Toggle in the Export JSON flyout that expands referenced objects into their full inline definition.',
                    })}
                    checked={forceExportByValue}
                    onChange={() => setForceExportByValue(!forceExportByValue)}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}

        {isByReference && !forceExportByValue && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut announceOnMount>
              <FormattedMessage
                id="share.exportJson.showFullConfigCallout"
                defaultMessage="This export stores only a reference. Select {buttonLabel} to see the complete definition."
                description="Shown in the Export JSON flyout when the exported object points to another saved object instead of embedding its definition inline. {buttonLabel} is the label of the toggle that expands it."
                values={{
                  buttonLabel: (
                    <i>
                      {i18n.translate('share.exportJson.showFullConfigSwitch', {
                        defaultMessage: 'Show full configuration',
                        description:
                          'Toggle in the Export JSON flyout that expands referenced objects into their full inline definition.',
                      })}
                    </i>
                  ),
                }}
              />
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="exportJsonFlyoutBody" css={flyoutBodyCss}>
        <EuiFlexGroup css={{ height: '100%' }} direction="column">
          <ExportJsonPanel
            status={status}
            data={data}
            warnings={warnings}
            error={error}
            onRetry={retry}
            renderAdditionalActions={renderAdditionalActions}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="exportJsonCloseButton" onClick={closeFlyout}>
              <FormattedMessage
                id="share.exportJson.closeFlyoutButtonLabel"
                defaultMessage="Close"
                description="Dismisses the export flyout without downloading anything."
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onDownload}
              data-test-subj="exportJsonDownloadButton"
              disabled={status !== 'success' || data === undefined}
            >
              {i18n.translate('share.exportJson.downloadButtonLabel', {
                defaultMessage: 'Download JSON',
                description:
                  'Primary action of the export flyout: saves the displayed JSON as a .json file.',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
};
