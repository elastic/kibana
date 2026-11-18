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
  const [objects, setObjects] = useState<ImportReferencedObjectsRequest['objects']>();
  const [fileError, setFileError] = useState<string>();
  const [mode, setMode] = useState<ImportMode>('request_action');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const [response, setResponse] = useState<ImportReferencedObjectsResponse>();

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
      setResponse(await importObjects({ objects, mode }));
      onImportComplete();
    } catch (error) {
      setImportError(getClientErrorMessage(error) ?? strings.getGenericErrorText());
    } finally {
      setIsImporting(false);
    }
  };

  const renderResults = ({ success, results }: ImportReferencedObjectsResponse) => {
    const importedCount = results.filter(
      ({ status }) => status === 'created' || status === 'overwritten'
    ).length;
    const reused = results.filter(({ status }) => status === 'reused');
    const Callout = success ? KbnSuccessCallout : KbnWarningCallout;
    return (
      <>
        <Callout
          title={strings.getResultsSummary(importedCount, results.length, reused.length)}
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
      {importError && (
        <>
          <KbnDangerCallout
            title={strings.getErrorTitle()}
            data-test-subj="importReferencedObjectsError"
          >
            {importError}
          </KbnDangerCallout>
          <EuiSpacer size="m" />
        </>
      )}
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
      <EuiFlyoutBody>{response ? renderResults(response) : renderForm()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="importReferencedObjectsClose">
              {response ? strings.getCloseButtonLabel() : strings.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
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
