/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  EuiAccordion,
  EuiBasicTable,
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
  euiYScrollWithShadows,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AsCodeRelatedItem } from '@kbn/as-code-shared-schemas';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';

import { importJsonFlyoutStrings } from './import_json_strings';
import type { CreateFromJson, ImportJsonFlyoutServices, SanitizeImportJson } from './types';

/** Matches core `server.maxPayload` default (1 MiB). */
const MAX_IMPORT_JSON_FILE_BYTES = 1_048_576;

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
  const euiThemeContext = useEuiTheme();
  const warningsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}Warnings`,
  });
  const relatedItemsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}RelatedItems`,
  });
  const savedObjectsHref = services.application.getUrlForApp('management', {
    path: '/kibana/objects',
  });
  const [filePickerError, setFilePickerError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [relatedItems, setRelatedItems] = useState<AsCodeRelatedItem[]>([]);
  const [relatedItemsCount, setRelatedItemsCount] = useState(0);
  const [sanitizedState, setSanitizedState] = useState<SanitizedState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [isRelatedItemsExpanded, setIsRelatedItemsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);
  const sanitizeAbortRef = useRef<AbortController | null>(null);

  const warningsListStyles = useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, { height: 'auto' })}
      max-height: 240px;
      padding-top: ${euiThemeContext.euiTheme.size.s};
      padding-bottom: ${euiThemeContext.euiTheme.size.s};
    `,
    [euiThemeContext]
  );
  const relatedItemsColumns = useMemo<Array<EuiBasicTableColumn<AsCodeRelatedItem>>>(
    () => [
      {
        field: 'type_label',
        name: importJsonFlyoutStrings.getRelatedItemsTypeColumn(),
      },
      {
        field: 'id',
        name: importJsonFlyoutStrings.getRelatedItemsIdColumn(),
      },
    ],
    []
  );

  const abortSanitize = useCallback(() => {
    sanitizeAbortRef.current?.abort();
    sanitizeAbortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortSanitize();
    };
  }, [abortSanitize]);

  const resetState = useCallback(() => {
    setFilePickerError(null);
    setServerError(null);
    setWarnings([]);
    setRelatedItems([]);
    setRelatedItemsCount(0);
    setSanitizedState(null);
    setIsWarningsExpanded(false);
    setIsRelatedItemsExpanded(false);
    setShowWarningsCallout(true);
  }, []);

  const onFileChange = useCallback(
    async (files: FileList | null) => {
      abortSanitize();
      resetState();
      const selected = files?.[0] ?? null;

      if (!selected) {
        setIsValidating(false);
        return;
      }

      if (selected.size > MAX_IMPORT_JSON_FILE_BYTES) {
        setFilePickerError(importJsonFlyoutStrings.getFileTooLargeError());
        setIsValidating(false);
        return;
      }

      const abortController = new AbortController();
      sanitizeAbortRef.current = abortController;
      setIsValidating(true);
      try {
        const text = await selected.text();
        if (abortController.signal.aborted) return;

        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          setFilePickerError(importJsonFlyoutStrings.getInvalidJsonError());
          return;
        }

        try {
          const {
            data,
            warnings: sanitizeWarnings,
            relatedItems: sanitizeRelatedItems = [],
            relatedItemsCount: sanitizeRelatedItemsCount,
          } = await sanitizeImportJson(raw, abortController.signal);
          if (abortController.signal.aborted) return;
          setWarnings(sanitizeWarnings);
          setRelatedItems(sanitizeRelatedItems);
          setRelatedItemsCount(sanitizeRelatedItemsCount ?? sanitizeRelatedItems.length);
          setSanitizedState(data);
        } catch (error) {
          const wasAborted =
            abortController.signal.aborted ||
            (error instanceof Error && error.name === 'AbortError');
          if (wasAborted) {
            return;
          }
          setServerError(serverValidationError);
        }
      } finally {
        if (sanitizeAbortRef.current === abortController) {
          sanitizeAbortRef.current = null;
          setIsValidating(false);
        }
      }
    },
    [abortSanitize, resetState, sanitizeImportJson, serverValidationError]
  );

  const onImport = useCallback(async () => {
    if (!sanitizedState) return;

    setIsImporting(true);
    try {
      const result = await createFromJson(sanitizedState);
      closeFlyout();
      onImportSuccess(result.id, result.title);
    } catch (e) {
      services.notifications.toasts.addDanger({
        title,
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsImporting(false);
    }
  }, [sanitizedState, createFromJson, closeFlyout, onImportSuccess, services, title]);

  const canImport = Boolean(sanitizedState) && !isValidating && !filePickerError && !serverError;
  const warningsSummary =
    getWarningsSummary?.(warnings.length) ??
    importJsonFlyoutStrings.getWarningsSummary(warnings.length);

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
              defaultMessage="Trying to import an NDJSON? Do it from {link}."
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

        {showWarningsCallout && (warnings.length > 0 || relatedItems.length > 0) && (
          <>
            <KbnWarningCallout
              announceOnMount
              size="s"
              title={
                relatedItems.length > 0
                  ? importJsonFlyoutStrings.getReviewWarningsTitle()
                  : importJsonFlyoutStrings.getWarningsTitle()
              }
              text={
                relatedItems.length > 0
                  ? importJsonFlyoutStrings.getReviewWarningsSummary()
                  : warningsSummary
              }
              data-test-subj={`${dataTestSubjPrefix}Warnings`}
              onDismiss={() => {
                setShowWarningsCallout(false);
                setIsWarningsExpanded(false);
                setIsRelatedItemsExpanded(false);
              }}
            >
              {warnings.length > 0 && (
                <>
                  {relatedItems.length > 0 && (
                    <EuiText size="s">
                      <p>{warningsSummary}</p>
                    </EuiText>
                  )}
                  <EuiAccordion
                    id={warningsAccordionId}
                    initialIsOpen={false}
                    onToggle={setIsWarningsExpanded}
                    paddingSize="s"
                    buttonContent={
                      isWarningsExpanded
                        ? importJsonFlyoutStrings.getWarningsAccordionHide()
                        : importJsonFlyoutStrings.getWarningsAccordionShow()
                    }
                    data-test-subj={`${dataTestSubjPrefix}WarningsAccordion`}
                  >
                    {isWarningsExpanded ? (
                      <EuiText
                        size="s"
                        data-test-subj={`${dataTestSubjPrefix}WarningsList`}
                        css={warningsListStyles}
                      >
                        <ul>
                          {warnings.map((warning, index) => (
                            <li key={`${index}-${warning}`}>{warning}</li>
                          ))}
                        </ul>
                      </EuiText>
                    ) : null}
                  </EuiAccordion>
                </>
              )}
              {relatedItems.length > 0 && (
                <>
                  {warnings.length > 0 && <EuiSpacer size="s" />}
                  <EuiText size="s">
                    <p>{importJsonFlyoutStrings.getRelatedItemsSummary(relatedItemsCount)}</p>
                    {relatedItemsCount > relatedItems.length && (
                      <p>
                        {importJsonFlyoutStrings.getRelatedItemsTruncatedSummary(
                          relatedItems.length
                        )}
                      </p>
                    )}
                  </EuiText>
                  <EuiAccordion
                    id={relatedItemsAccordionId}
                    initialIsOpen={false}
                    onToggle={setIsRelatedItemsExpanded}
                    paddingSize="s"
                    buttonContent={
                      isRelatedItemsExpanded
                        ? importJsonFlyoutStrings.getWarningsAccordionHide()
                        : importJsonFlyoutStrings.getWarningsAccordionShow()
                    }
                    data-test-subj={`${dataTestSubjPrefix}RelatedItemsAccordion`}
                  >
                    {isRelatedItemsExpanded ? (
                      <div
                        data-test-subj={`${dataTestSubjPrefix}RelatedItemsList`}
                        css={warningsListStyles}
                      >
                        <EuiBasicTable
                          compressed
                          items={relatedItems}
                          columns={relatedItemsColumns}
                          tableCaption={importJsonFlyoutStrings.getRelatedItemsTableCaption()}
                          responsiveBreakpoint={false}
                        />
                      </div>
                    ) : null}
                  </EuiAccordion>
                </>
              )}
            </KbnWarningCallout>
            <EuiSpacer size="m" />
          </>
        )}

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
