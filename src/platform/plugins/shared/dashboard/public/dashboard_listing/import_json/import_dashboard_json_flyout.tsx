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
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DashboardState } from '../../../common';
import { dashboardClient } from '../../dashboard_client/dashboard_client';
import { coreServices } from '../../services/kibana_services';
import { sanitizeDashboard } from '../../dashboard_app/top_nav/share/export_json/sanitize_dashboard';
import { importDashboardJsonStrings } from './_import_dashboard_json_strings';

interface ImportDashboardJsonFlyoutProps {
  closeFlyout: () => void;
  onImportSuccess: (id: string, title: string) => void;
}

/**
 * Parses the file contents as a raw DashboardState (the format produced by Export JSON).
 * The public API response shape `{ id, data, meta }` is intentionally rejected — only
 * the inner `data` is importable, and users should not hand-edit API responses.
 */
const parseDashboardJson = (raw: unknown): DashboardState => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('not an object');
  }

  const obj = raw as Record<string, unknown>;

  // Reject the public API response shape { id, data, meta } — importing id/meta is not supported.
  if (typeof obj.id === 'string' && typeof obj.data === 'object') {
    throw new Error('api response shape');
  }

  // DashboardState must have a title string at minimum.
  if (typeof obj.title === 'string') {
    return obj as unknown as DashboardState;
  }

  throw new Error('unrecognised format');
};

export const ImportDashboardJsonFlyout = ({
  closeFlyout,
  onImportSuccess,
}: ImportDashboardJsonFlyoutProps) => {
  const [parseError, setParseError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sanitizedState, setSanitizedState] = useState<DashboardState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const resetState = useCallback(() => {
    setParseError(null);
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
          setParseError(importDashboardJsonStrings.getInvalidJsonError());
          return;
        }

        let state: DashboardState;
        try {
          state = parseDashboardJson(raw);
        } catch {
          setParseError(importDashboardJsonStrings.getInvalidFormatError());
          return;
        }

        const { data, warnings: sanitizeWarnings } = await sanitizeDashboard(state);
        setWarnings(sanitizeWarnings);
        setSanitizedState(data);
      } catch (e) {
        coreServices.notifications.toasts.addDanger({
          title: importDashboardJsonStrings.getFlyoutTitle(),
          text: e instanceof Error ? e.message : String(e),
        });
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

  const canImport = Boolean(sanitizedState) && !isValidating && !parseError;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{importDashboardJsonStrings.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="dashboard.importJson.flyout.ndjsonNote"
              defaultMessage="This importer accepts JSON only. To import an NDJSON file, use {link}."
              values={{
                link: (
                  <EuiLink
                    href={coreServices.application.getUrlForApp('management', {
                      path: '/kibana/objects',
                    })}
                  >
                    <FormattedMessage
                      id="dashboard.importJson.flyout.ndjsonNoteLink"
                      defaultMessage="Stack Management &gt; Saved Objects"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiForm>
          <EuiFormRow
            label={importDashboardJsonStrings.getFilePickerLabel()}
            isInvalid={Boolean(parseError)}
            error={parseError ?? undefined}
          >
            <EuiFilePicker
              accept=".json"
              onChange={onFileChange}
              isLoading={isValidating}
              isInvalid={Boolean(parseError)}
              data-test-subj="importDashboardJsonFilePicker"
            />
          </EuiFormRow>
        </EuiForm>

        {warnings.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={importDashboardJsonStrings.getWarningsTitle()}
              color="warning"
              iconType="warning"
              data-test-subj="importDashboardJsonWarnings"
            >
              <p>{importDashboardJsonStrings.getWarningsBody()}</p>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </EuiCallOut>
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
