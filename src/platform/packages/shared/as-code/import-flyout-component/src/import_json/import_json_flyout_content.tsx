/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';

import { importJsonFlyoutStrings } from './import_json_strings';
import { ImportJsonWarningsCallout } from './import_json_warnings_callout';
import type { CreateFromJson, ImportJsonFlyoutServices, SanitizeImportJson } from './types';
import { useImportJsonFlyoutState } from './use_import_json_flyout_state';

export interface ImportJsonFlyoutContentProps<SanitizedState> {
  title: string;
  titleId: string;
  closeFlyout: () => void;
  dataTestSubjPrefix: string;
  /** Display name of the exporting app in the info callout (e.g. "Dashboard application"). */
  exportApplication: string;
  services: ImportJsonFlyoutServices;
  isTechnicalPreview?: boolean;
  serverValidationError: string;
  /** Override the default generic warnings summary. */
  getWarningsSummary?: (count: number) => string;
  sanitizeImportJson: SanitizeImportJson<SanitizedState>;
  createFromJson: CreateFromJson<SanitizedState>;
  onImportSuccess: (id: string, title: string) => void;
}

export const ImportJsonFlyoutContent = <SanitizedState,>({
  title,
  titleId,
  closeFlyout,
  dataTestSubjPrefix,
  exportApplication,
  services,
  isTechnicalPreview = false,
  serverValidationError,
  getWarningsSummary,
  sanitizeImportJson,
  createFromJson,
  onImportSuccess,
}: ImportJsonFlyoutContentProps<SanitizedState>) => {
  const savedObjectsHref = services.application.getUrlForApp('management', {
    path: '/kibana/objects',
  });
  const {
    filePickerError,
    serverError,
    warnings,
    relatedItems,
    relatedItemsCount,
    isValidating,
    isImporting,
    fileSelectionId,
    canImport,
    onFileChange,
    onImport,
  } = useImportJsonFlyoutState({
    title,
    closeFlyout,
    services,
    serverValidationError,
    sanitizeImportJson,
    createFromJson,
    onImportSuccess,
  });

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
        {isTechnicalPreview && (
          <>
            <EuiSpacer size="s" />
            <EuiBetaBadge
              label={importJsonFlyoutStrings.getTechnicalPreviewBadgeLabel()}
              tooltipContent={importJsonFlyoutStrings.getTechnicalPreviewBadgeTooltip()}
              size="s"
              data-test-subj={`${dataTestSubjPrefix}TechnicalPreviewBadge`}
            />
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <KbnInfoCallout
          title={importJsonFlyoutStrings.getInfoCalloutTitle(exportApplication)}
          text={
            <FormattedMessage
              id="asCodeImport.importJson.ndjsonNote"
              defaultMessage="If you have an NDJSON file, import it from {link} instead."
              values={{
                link: (
                  <EuiLink href={savedObjectsHref}>
                    {importJsonFlyoutStrings.getNdjsonNoteLinkLabel()}
                  </EuiLink>
                ),
              }}
            />
          }
        />
        <EuiSpacer size="m" />

        {serverError && (
          <>
            <KbnDangerCallout
              announceOnMount
              title={serverError}
              data-test-subj={`${dataTestSubjPrefix}ServerError`}
            />
            <EuiSpacer size="m" />
          </>
        )}

        <ImportJsonWarningsCallout
          key={fileSelectionId}
          dataTestSubjPrefix={dataTestSubjPrefix}
          warnings={warnings}
          relatedItems={relatedItems}
          relatedItemsCount={relatedItemsCount}
          getWarningsSummary={getWarningsSummary}
        />

        <EuiForm fullWidth>
          <EuiFormRow
            fullWidth
            label={importJsonFlyoutStrings.getFilePickerLabel()}
            isInvalid={Boolean(filePickerError)}
            error={filePickerError ?? undefined}
          >
            <EuiFilePicker
              fullWidth
              accept=".json"
              onChange={onFileChange}
              isLoading={isValidating}
              isInvalid={Boolean(filePickerError)}
              data-test-subj={`${dataTestSubjPrefix}FilePicker`}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={closeFlyout}
              data-test-subj={`${dataTestSubjPrefix}CancelButton`}
            >
              {importJsonFlyoutStrings.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!canImport}
              isLoading={isImporting}
              onClick={onImport}
              data-test-subj={`${dataTestSubjPrefix}ImportButton`}
            >
              {isImporting
                ? importJsonFlyoutStrings.getImportingLabel()
                : importJsonFlyoutStrings.getImportButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
