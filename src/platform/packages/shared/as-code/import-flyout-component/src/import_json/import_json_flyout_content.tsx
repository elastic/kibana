/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';

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
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { ImportJsonServerErrorCallout } from './import_json_server_error_callout';
import { importJsonFlyoutStrings } from './import_json_strings';
import { ImportJsonWarningsCallout } from './import_json_warnings_callout';
import type { CreateFromJson, ImportJsonFlyoutServices, SanitizeImportJson } from './types';
import { useImportJsonFlyoutState } from './use_import_json_flyout_state';

export interface ImportJsonFlyoutContentProps<SanitizedState> {
  title: string;
  titleId: string;
  closeFlyout: () => void;
  dataTestSubjPrefix: string;
  services: ImportJsonFlyoutServices;
  isTechnicalPreview?: boolean;
  /** Application-specific description shown above the NDJSON note. */
  description?: ReactNode;
  serverValidationErrorTitle: string;
  serverValidationErrorText?: ReactNode;
  /** Override the default generic warnings summary. */
  getWarningsSummary?: (count: number) => string;
  /** Override the default summary of related items that don't exist in this cluster or space. */
  getMissingRelatedItemsSummary?: (count: number) => string;
  sanitizeImportJson: SanitizeImportJson<SanitizedState>;
  createFromJson: CreateFromJson<SanitizedState>;
  onImportSuccess: (id: string, title: string) => void;
}

export const ImportJsonFlyoutContent = <SanitizedState,>({
  title,
  titleId,
  closeFlyout,
  dataTestSubjPrefix,
  services,
  isTechnicalPreview = false,
  description,
  serverValidationErrorTitle,
  serverValidationErrorText,
  getWarningsSummary,
  getMissingRelatedItemsSummary,
  sanitizeImportJson,
  createFromJson,
  onImportSuccess,
}: ImportJsonFlyoutContentProps<SanitizedState>) => {
  const savedObjectsHref = services.application.getUrlForApp('management', {
    path: '/kibana/objects',
  });
  const {
    inputError,
    serverError,
    warnings,
    relatedItems,
    relatedItemsCount,
    isValidating,
    isImporting,
    inputVersion,
    canImport,
    onFileChange,
    onImport,
  } = useImportJsonFlyoutState({
    title,
    closeFlyout,
    services,
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
        <EuiText size="s">
          {description}
          <p>
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
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        {serverError && (
          <ImportJsonServerErrorCallout
            dataTestSubjPrefix={dataTestSubjPrefix}
            title={serverValidationErrorTitle}
            text={serverValidationErrorText}
            details={serverError.details}
          />
        )}

        <ImportJsonWarningsCallout
          key={inputVersion}
          dataTestSubjPrefix={dataTestSubjPrefix}
          warnings={warnings}
          relatedItems={relatedItems}
          relatedItemsCount={relatedItemsCount}
          getWarningsSummary={getWarningsSummary}
          getMissingRelatedItemsSummary={getMissingRelatedItemsSummary}
        />

        <EuiForm fullWidth>
          <EuiFormRow
            fullWidth
            label={importJsonFlyoutStrings.getFilePickerLabel()}
            isInvalid={Boolean(inputError)}
            error={inputError ?? undefined}
          >
            <EuiFilePicker
              fullWidth
              accept=".json"
              onChange={onFileChange}
              isLoading={isValidating}
              isInvalid={Boolean(inputError)}
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
