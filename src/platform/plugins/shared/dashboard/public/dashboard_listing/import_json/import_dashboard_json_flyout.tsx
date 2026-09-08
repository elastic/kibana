/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
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
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiLink,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';

import type { DashboardState } from '../../../common';
import { dashboardClient } from '../../dashboard_client/dashboard_client';
import { coreServices } from '../../services/kibana_services';
import { sanitizeDashboard } from '../../dashboard_app/top_nav/share/export_json/sanitize_dashboard';
import { importDashboardJsonStrings } from './_import_dashboard_json_strings';

interface ImportDashboardJsonFlyoutProps {
  closeFlyout: () => void;
  onImportSuccess: (id: string, title: string) => void;
}

interface ServerError {
  friendly: string;
  details: string;
}

export const ImportDashboardJsonFlyout = ({
  closeFlyout,
  onImportSuccess,
}: ImportDashboardJsonFlyoutProps) => {
  const serverErrorDetailsId = useGeneratedHtmlId({ prefix: 'importDashboardJsonServerError' });

  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [isServerErrorExpanded, setIsServerErrorExpanded] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sanitizedState, setSanitizedState] = useState<DashboardState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const resetState = useCallback(() => {
    setJsonParseError(null);
    setServerError(null);
    setIsServerErrorExpanded(false);
    setWarnings([]);
    setSanitizedState(null);
  }, []);

  const onFileChange = useCallback(
    async (files: FileList | null) => {
      resetState();
      const selected = files?.[0] ?? null;

      if (!selected) return;

      setIsValidating(true);
      try {
        const text = await selected.text();
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          setJsonParseError(importDashboardJsonStrings.getInvalidJsonError());
          return;
        }

        try {
          const { data, warnings: sanitizeWarnings } = await sanitizeDashboard(
            raw as DashboardState
          );
          setWarnings(sanitizeWarnings);
          setSanitizedState(data);
        } catch (e) {
          setServerError({
            friendly: importDashboardJsonStrings.getServerValidationError(),
            details: e instanceof Error ? e.message : String(e),
          });
        }
      } finally {
        setIsValidating(false);
      }
    },
    [resetState]
  );

  const onImport = useCallback(async () => {
    if (!sanitizedState) return;

    setIsImporting(true);
    try {
      const result = await dashboardClient.create(sanitizedState);
      closeFlyout();
      onImportSuccess(result.id, result.data.title ?? '');
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: importDashboardJsonStrings.getFlyoutTitle(),
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsImporting(false);
    }
  }, [sanitizedState, closeFlyout, onImportSuccess]);

  const canImport = Boolean(sanitizedState) && !isValidating && !jsonParseError && !serverError;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{importDashboardJsonStrings.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <KbnInfoCallout
          title={importDashboardJsonStrings.getInfoCalloutTitle()}
          text={
            <FormattedMessage
              id="dashboard.importJson.flyout.ndjsonNote"
              defaultMessage="Trying to import an NDJSON? Do it from {link}."
              values={{
                link: (
                  <EuiLink
                    href={coreServices.application.getUrlForApp('management', {
                      path: '/kibana/objects',
                    })}
                  >
                    <FormattedMessage
                      id="dashboard.importJson.flyout.ndjsonNoteLink"
                      defaultMessage="here"
                    />
                  </EuiLink>
                ),
              }}
            />
          }
        />

        <EuiSpacer size="m" />

        <EuiForm>
          <EuiFormRow
            label={importDashboardJsonStrings.getFilePickerLabel()}
            isInvalid={Boolean(jsonParseError)}
            error={jsonParseError ?? undefined}
          >
            <EuiFilePicker
              accept=".json"
              onChange={onFileChange}
              isLoading={isValidating}
              isInvalid={Boolean(jsonParseError)}
              data-test-subj="importDashboardJsonFilePicker"
            />
          </EuiFormRow>
        </EuiForm>

        {serverError && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout
              announceOnMount
              title={serverError.friendly}
              data-test-subj="importDashboardJsonServerError"
            >
              <EuiAccordion
                id={serverErrorDetailsId}
                initialIsOpen={false}
                paddingSize="s"
                onToggle={setIsServerErrorExpanded}
                buttonContent={
                  isServerErrorExpanded
                    ? importDashboardJsonStrings.getServerErrorHideDetails()
                    : importDashboardJsonStrings.getServerErrorShowDetails()
                }
                data-test-subj="importDashboardJsonServerErrorDetails"
              >
                {isServerErrorExpanded && <EuiText size="s">{serverError.details}</EuiText>}
              </EuiAccordion>
            </KbnDangerCallout>
          </>
        )}

        {warnings.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <KbnWarningCallout
              announceOnMount
              title={importDashboardJsonStrings.getWarningsTitle()}
              text={importDashboardJsonStrings.getWarningsBody()}
              data-test-subj="importDashboardJsonWarnings"
            >
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </KbnWarningCallout>
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="importDashboardJsonCancelButton">
              {importDashboardJsonStrings.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!canImport}
              isLoading={isImporting}
              onClick={onImport}
              data-test-subj="importDashboardJsonImportButton"
            >
              {isImporting
                ? importDashboardJsonStrings.getImportingLabel()
                : importDashboardJsonStrings.getImportButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
