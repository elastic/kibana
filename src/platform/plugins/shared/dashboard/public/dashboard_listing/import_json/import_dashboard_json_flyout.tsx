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
  euiYScrollWithShadows,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
  titleId: string;
}

export const ImportDashboardJsonFlyout = ({
  closeFlyout,
  onImportSuccess,
  titleId,
}: ImportDashboardJsonFlyoutProps) => {
  const euiThemeContext = useEuiTheme();
  const warningsAccordionId = useGeneratedHtmlId({
    prefix: 'importDashboardJsonWarnings',
  });

  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sanitizedState, setSanitizedState] = useState<DashboardState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);

  const warningsListStyles = useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, { height: 'auto' })}
      max-height: 240px;
      padding-top: ${euiThemeContext.euiTheme.size.s};
      padding-bottom: ${euiThemeContext.euiTheme.size.s};
    `,
    [euiThemeContext]
  );

  const resetState = useCallback(() => {
    setJsonParseError(null);
    setServerError(null);
    setWarnings([]);
    setSanitizedState(null);
    setIsWarningsExpanded(false);
    setShowWarningsCallout(true);
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
        } catch {
          setServerError(importDashboardJsonStrings.getServerValidationError());
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
          <h2 id={titleId}>{importDashboardJsonStrings.getFlyoutTitle()}</h2>
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

        {serverError && (
          <>
            <KbnDangerCallout
              announceOnMount
              title={serverError}
              data-test-subj="importDashboardJsonServerError"
            />
            <EuiSpacer size="m" />
          </>
        )}

        {showWarningsCallout && warnings.length > 0 && (
          <>
            <KbnWarningCallout
              announceOnMount
              size="s"
              title={importDashboardJsonStrings.getWarningsTitle()}
              text={importDashboardJsonStrings.getWarningsBody(warnings.length)}
              data-test-subj="importDashboardJsonWarnings"
              onDismiss={() => {
                setShowWarningsCallout(false);
                setIsWarningsExpanded(false);
              }}
            >
              <EuiAccordion
                id={warningsAccordionId}
                initialIsOpen={false}
                onToggle={setIsWarningsExpanded}
                paddingSize="s"
                buttonContent={
                  isWarningsExpanded
                    ? importDashboardJsonStrings.getWarningsAccordionHide()
                    : importDashboardJsonStrings.getWarningsAccordionShow()
                }
              >
                {isWarningsExpanded ? (
                  <EuiText
                    size="s"
                    data-test-subj="importDashboardJsonWarningsList"
                    css={warningsListStyles}
                  >
                    <ul>
                      {warnings.map((w, i) => (
                        <li key={`${i}-${w}`}>{w}</li>
                      ))}
                    </ul>
                  </EuiText>
                ) : null}
              </EuiAccordion>
            </KbnWarningCallout>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiForm fullWidth>
          <EuiFormRow
            fullWidth
            label={importDashboardJsonStrings.getFilePickerLabel()}
            isInvalid={Boolean(jsonParseError)}
            error={jsonParseError ?? undefined}
          >
            <EuiFilePicker
              fullWidth
              accept=".json"
              onChange={onFileChange}
              isLoading={isValidating}
              isInvalid={Boolean(jsonParseError)}
              data-test-subj="importDashboardJsonFilePicker"
            />
          </EuiFormRow>
        </EuiForm>
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
