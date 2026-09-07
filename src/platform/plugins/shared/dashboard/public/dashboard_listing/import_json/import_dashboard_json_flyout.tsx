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
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';

import type { DashboardState } from '../../../common';
import { dashboardClient } from '../../dashboard_client/dashboard_client';
import { coreServices } from '../../services/kibana_services';
import { sanitizeDashboard } from '../../dashboard_app/top_nav/share/export_json/sanitize_dashboard';
import { importDashboardJsonStrings } from './_import_dashboard_json_strings';

interface ImportDashboardJsonFlyoutProps {
  closeFlyout: () => void;
  onImportSuccess: (id: string, title: string) => void;
}

type ConflictChoice = 'new' | 'overwrite';

/** Parsed input: the state plus an optional existing ID from the API response shape. */
interface ParsedDashboard {
  state: DashboardState;
  id?: string;
}

/** Accepts both the raw DashboardState and the `{ id, data, meta }` public API shape. */
const parseDashboardJson = (raw: unknown): ParsedDashboard => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('not an object');
  }

  const obj = raw as Record<string, unknown>;

  // Public API shape: { id, data, meta }
  if (typeof obj.data === 'object' && obj.data !== null && typeof obj.id === 'string') {
    return { state: obj.data as DashboardState, id: obj.id };
  }

  // Raw DashboardState (no wrapping id/data keys)
  // Minimal heuristic: must have a `title` string (DashboardState requires it via schema)
  if (typeof obj.title === 'string') {
    return { state: obj as unknown as DashboardState };
  }

  throw new Error('unrecognised format');
};

export const ImportDashboardJsonFlyout = ({
  closeFlyout,
  onImportSuccess,
}: ImportDashboardJsonFlyoutProps) => {
  const [parseError, setParseError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedDashboard | null>(null);
  const [conflictExists, setConflictExists] = useState(false);
  const [conflictChoice, setConflictChoice] = useState<ConflictChoice>('new');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const resetState = useCallback(() => {
    setParseError(null);
    setWarnings([]);
    setParsed(null);
    setConflictExists(false);
    setConflictChoice('new');
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

        let result: ParsedDashboard;
        try {
          result = parseDashboardJson(raw);
        } catch {
          setParseError(importDashboardJsonStrings.getInvalidFormatError());
          return;
        }

        // Sanitize to get warnings and cleaned state
        const { data: sanitizedState, warnings: sanitizeWarnings } = await sanitizeDashboard(
          result.state
        );
        setWarnings(sanitizeWarnings);
        setParsed({ state: sanitizedState, id: result.id });

        // Check for ID conflict if the JSON carries an id
        if (result.id) {
          try {
            await dashboardClient.get(result.id);
            setConflictExists(true);
          } catch (e) {
            if (!(e instanceof SavedObjectNotFound)) {
              throw e;
            }
          }
        }
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
    if (!parsed) return;

    setIsImporting(true);
    try {
      let result: { id: string; data: DashboardState };

      if (conflictExists && conflictChoice === 'overwrite' && parsed.id) {
        result = await dashboardClient.update(parsed.id, parsed.state);
      } else {
        result = await dashboardClient.create(parsed.state);
      }

      const importedTitle = result.data.title ?? '';
      closeFlyout();
      onImportSuccess(result.id, importedTitle);
    } catch (e) {
      coreServices.notifications.toasts.addDanger({
        title: importDashboardJsonStrings.getFlyoutTitle(),
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsImporting(false);
    }
  }, [parsed, conflictExists, conflictChoice, closeFlyout, onImportSuccess]);

  const conflictRadios = [
    {
      id: 'new',
      label: importDashboardJsonStrings.getCreateNewCopyLabel(),
    },
    {
      id: 'overwrite',
      label: importDashboardJsonStrings.getOverwriteLabel(),
    },
  ];

  const canImport = Boolean(parsed) && !isValidating && !parseError;

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

        {conflictExists && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={importDashboardJsonStrings.getConflictTitle()}
              color="warning"
              iconType="warning"
              data-test-subj="importDashboardJsonConflict"
            >
              <EuiRadioGroup
                name="importDashboardJsonConflictChoice"
                options={conflictRadios}
                idSelected={conflictChoice}
                onChange={(id) => setConflictChoice(id as ConflictChoice)}
                data-test-subj="importDashboardJsonConflictChoice"
              />
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
