/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { SavedObjectTypeIdTuple } from '@kbn/core/public';
import { getClientErrorMessage } from '@kbn/as-code-import-flyout-component';
import type {
  ImportReferencedObjectsRequest,
  ImportReferencedObjectsResponse,
} from '@kbn/saved-objects-management-plugin/common';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';

import { importReferencedObjectsStrings as strings } from './_import_referenced_objects_strings';

type ImportMode = ImportReferencedObjectsRequest['mode'];
type ImportResult = ImportReferencedObjectsResponse['results'][number];
type ImportWarning = ImportReferencedObjectsResponse['warnings'][number];
type DecisionAction = NonNullable<ImportReferencedObjectsRequest['decisions']>[number]['action'];

const toKey = ({ type, id }: SavedObjectTypeIdTuple) => `${type}:${id}`;
const toWarningKey = ({ from, reference }: ImportWarning) => `${toKey(from)}>${toKey(reference)}`;

const mergeResponses = (
  first: ImportReferencedObjectsResponse,
  decided: ImportReferencedObjectsResponse
): ImportReferencedObjectsResponse => {
  const decidedResults = new Map(decided.results.map((result) => [toKey(result), result]));
  const results = first.results.map((result) => decidedResults.get(toKey(result)) ?? result);
  return {
    success: results.every(({ status }) => status !== 'conflict' && status !== 'error'),
    results,
    // An object retried by a decision can report the same missing reference again.
    warnings: [
      ...new Map(
        [...first.warnings, ...decided.warnings].map((warning) => [toWarningKey(warning), warning])
      ).values(),
    ],
  };
};

interface ImportReferencedObjectsFlyoutProps {
  titleId: string;
  closeFlyout: () => void;
  importObjects: (body: ImportReferencedObjectsRequest) => Promise<ImportReferencedObjectsResponse>;
  /** Called once an import has written, or tried to write, the objects. */
  onImportComplete: () => void;
}

const STATUS_COLORS: Record<ImportResult['status'], string> = {
  created: 'success',
  overwritten: 'success',
  reused: 'hollow',
  conflict: 'warning',
  skipped: 'default',
  error: 'danger',
};

const isExportedObject = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  const { type, id, data } = value as Record<string, unknown>;
  return (
    typeof type === 'string' && typeof id === 'string' && typeof data === 'object' && data !== null
  );
};

/** Reads the `objects` of an export file, or returns undefined if the file isn't an export. */
const readExportedObjects = async (
  file: File
): Promise<ImportReferencedObjectsRequest['objects'] | undefined> => {
  try {
    const parsed: unknown = JSON.parse(await file.text());
    const objects =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>).objects
        : undefined;
    return Array.isArray(objects) && objects.length > 0 && objects.every(isExportedObject)
      ? (objects as ImportReferencedObjectsRequest['objects'])
      : undefined;
  } catch {
    return undefined;
  }
};

export const ImportReferencedObjectsFlyout = ({
  titleId,
  closeFlyout,
  importObjects,
  onImportComplete,
}: ImportReferencedObjectsFlyoutProps) => {
  const modeGroupId = useGeneratedHtmlId({ prefix: 'importReferencedObjectsMode' });
  const conflictGroupPrefix = useGeneratedHtmlId({ prefix: 'importReferencedObjectsDecision' });
  const [objects, setObjects] = useState<ImportReferencedObjectsRequest['objects']>();
  const [fileError, setFileError] = useState<string>();
  const [mode, setMode] = useState<ImportMode>('request_action');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const [response, setResponse] = useState<ImportReferencedObjectsResponse>();
  const [decisions, setDecisions] = useState<Map<string, DecisionAction>>();

  const onFileChange = async (files: FileList | null) => {
    setObjects(undefined);
    setFileError(undefined);
    setImportError(undefined);
    const file = files?.[0];
    if (!file) return;
    const fileObjects = await readExportedObjects(file);
    if (fileObjects) {
      setObjects(fileObjects);
    } else {
      setFileError(strings.getInvalidFileError());
    }
  };

  const onImport = async () => {
    if (!objects) return;
    setIsImporting(true);
    setImportError(undefined);
    try {
      const imported = await importObjects({ objects, mode });
      setResponse(imported);
      const conflicts = imported.results.filter(({ status }) => status === 'conflict');
      if (mode === 'request_action' && conflicts.length > 0) {
        setDecisions(new Map(conflicts.map((conflict) => [toKey(conflict), 'skip'])));
      }
      onImportComplete();
    } catch (error) {
      setImportError(getClientErrorMessage(error) ?? strings.getGenericErrorText());
    } finally {
      setIsImporting(false);
    }
  };

  const onFinish = async () => {
    if (!objects || !response || !decisions) return;
    setIsImporting(true);
    setImportError(undefined);
    try {
      const decided = await importObjects({
        objects,
        mode,
        decisions: response.results.flatMap(({ type, id, destination_id: destinationId }) => {
          const action = decisions.get(toKey({ type, id }));
          return action ? [{ type, id, destination_id: destinationId, action }] : [];
        }),
      });
      setResponse(mergeResponses(response, decided));
      setDecisions(undefined);
      onImportComplete();
    } catch (error) {
      setImportError(getClientErrorMessage(error) ?? strings.getGenericErrorText());
    } finally {
      setIsImporting(false);
    }
  };

  const renderImportError = () =>
    importError && (
      <>
        <KbnDangerCallout
          title={strings.getErrorTitle()}
          data-test-subj="importReferencedObjectsError"
        >
          {importError}
        </KbnDangerCallout>
        <EuiSpacer size="m" />
      </>
    );

  const renderConflicts = (conflicts: ImportResult[], pending: Map<string, DecisionAction>) => (
    <>
      {renderImportError()}
      <KbnWarningCallout
        title={strings.getConflictsTitle(conflicts.length)}
        text={<p>{strings.getConflictsDescription()}</p>}
        data-test-subj="importReferencedObjectsConflicts"
      />
      <EuiSpacer size="m" />
      {conflicts.map(({ type, id }) => {
        const key = toKey({ type, id });
        const optionId = (action: DecisionAction) => `${conflictGroupPrefix}-${key}-${action}`;
        return (
          <React.Fragment key={key}>
            <EuiRadioGroup
              legend={{ children: `${type} ${id}` }}
              name={`${conflictGroupPrefix}-${key}`}
              idSelected={optionId(pending.get(key) ?? 'skip')}
              onChange={(selected) =>
                setDecisions(
                  new Map(pending).set(
                    key,
                    selected === optionId('overwrite') ? 'overwrite' : 'skip'
                  )
                )
              }
              options={[
                { id: optionId('overwrite'), label: strings.getOverwriteActionLabel() },
                { id: optionId('skip'), label: strings.getSkipActionLabel() },
              ]}
              data-test-subj="importReferencedObjectsDecision"
            />
            <EuiSpacer size="m" />
          </React.Fragment>
        );
      })}
    </>
  );

  const renderResults = ({ success, results, warnings }: ImportReferencedObjectsResponse) => {
    const imported = results.filter(
      ({ status }) => status === 'created' || status === 'overwritten'
    );
    const importedKeys = new Set(imported.map(toKey));
    // Only objects that were written can show a broken panel; a skipped or conflicting one is unchanged.
    const importedWarnings = warnings.filter(({ from }) => importedKeys.has(toKey(from)));
    const reused = results.filter(({ status }) => status === 'reused');
    const Callout = success ? KbnSuccessCallout : KbnWarningCallout;
    return (
      <>
        <Callout
          title={strings.getResultsSummary(imported.length, results.length, reused.length)}
          data-test-subj="importReferencedObjectsSummary"
        />
        <EuiSpacer size="m" />
        {reused.length > 0 && (
          <>
            <KbnInfoCallout
              title={strings.getReusedTitle()}
              text={<p>{strings.getReusedDescription()}</p>}
              data-test-subj="importReferencedObjectsReused"
            >
              <ul>
                {reused.map(({ type, id }) => (
                  <li key={`${type}:${id}`}>
                    <strong>{type}</strong> {id}
                  </li>
                ))}
              </ul>
            </KbnInfoCallout>
            <EuiSpacer size="m" />
          </>
        )}
        {importedWarnings.length > 0 && (
          <>
            <KbnWarningCallout
              title={strings.getWarningsTitle(importedWarnings.length)}
              text={<p>{strings.getWarningsDescription()}</p>}
              data-test-subj="importReferencedObjectsWarnings"
            >
              <ul>
                {importedWarnings.map((warning) => (
                  <li key={toWarningKey(warning)}>{strings.getMissingReferenceText(warning)}</li>
                ))}
              </ul>
            </KbnWarningCallout>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiBasicTable<ImportResult>
          tableCaption={strings.getResultsTableCaption()}
          items={results}
          rowHeader="id"
          columns={[
            { field: 'type', name: strings.getTypeColumnName() },
            { field: 'id', name: strings.getIdColumnName() },
            {
              name: strings.getDestinationIdColumnName(),
              render: ({ id, destination_id: destinationId }: ImportResult) =>
                destinationId === id ? '' : destinationId,
            },
            {
              name: strings.getStatusColumnName(),
              render: ({ status, error }: ImportResult) => (
                <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
                  <EuiBadge color={STATUS_COLORS[status]}>
                    {strings.getStatusLabel(status)}
                  </EuiBadge>
                  {status === 'conflict' && (
                    <EuiText size="xs">{strings.getConflictMessage()}</EuiText>
                  )}
                  {error && <EuiText size="xs">{error.message}</EuiText>}
                </EuiFlexGroup>
              ),
            },
          ]}
          data-test-subj="importReferencedObjectsResults"
        />
      </>
    );
  };

  const renderForm = () => (
    <>
      <EuiText size="s">
        <p>{strings.getDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />
      {renderImportError()}
      <EuiForm fullWidth>
        <EuiFormRow
          fullWidth
          label={strings.getFilePickerLabel()}
          isInvalid={Boolean(fileError)}
          error={fileError}
          helpText={objects ? strings.getObjectsInFile(objects.length) : undefined}
        >
          <EuiFilePicker
            fullWidth
            accept=".json"
            onChange={onFileChange}
            isInvalid={Boolean(fileError)}
            data-test-subj="importReferencedObjectsFilePicker"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={strings.getModeLegend()}
          labelType="legend"
          id={modeGroupId}
          helpText={mode === 'new_copies' ? strings.getNewCopiesHelpText() : undefined}
        >
          <EuiRadioGroup
            name={modeGroupId}
            idSelected={mode}
            onChange={(id) => setMode(id as ImportMode)}
            options={[
              { id: 'request_action', label: strings.getRequestActionLabel() },
              { id: 'overwrite', label: strings.getOverwriteLabel() },
              { id: 'new_copies', label: strings.getNewCopiesLabel() },
            ]}
            data-test-subj="importReferencedObjectsMode"
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );

  const renderBody = () => {
    if (!response) return renderForm();
    if (!decisions) return renderResults(response);
    return renderConflicts(
      response.results.filter((result) => decisions.has(toKey(result))),
      decisions
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{strings.getFlyoutTitle()}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBetaBadge
          label={strings.getTechnicalPreviewLabel()}
          tooltipContent={strings.getTechnicalPreviewTooltip()}
          size="s"
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="importReferencedObjectsClose">
              {response ? strings.getCloseButtonLabel() : strings.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {decisions && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isImporting}
                onClick={onFinish}
                data-test-subj="importReferencedObjectsFinishButton"
              >
                {strings.getFinishButtonLabel()}
              </EuiButton>
            </EuiFlexItem>
          )}
          {!response && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={!objects}
                isLoading={isImporting}
                onClick={onImport}
                data-test-subj="importReferencedObjectsImportButton"
              >
                {strings.getImportButtonLabel()}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
