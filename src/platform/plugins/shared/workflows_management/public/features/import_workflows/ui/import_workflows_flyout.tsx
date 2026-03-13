/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn, EuiFilePickerProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowPreview } from '../../../../common/lib/export';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useKibana } from '../../../hooks/use_kibana';

const ACCEPTED_FILE_TYPES = '.yml,.yaml,.zip';
const MB_SIZE_BYTES = 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 10 * MB_SIZE_BYTES; // 10 MB

const CONFLICT_RESOLUTION_OVERWRITE = 'overwrite';
const CONFLICT_RESOLUTION_GENERATE_NEW_IDS = 'generateNewIds';

type ConflictResolution =
  | typeof CONFLICT_RESOLUTION_OVERWRITE
  | typeof CONFLICT_RESOLUTION_GENERATE_NEW_IDS;

const isConflictResolution = (value: string): value is ConflictResolution =>
  value === CONFLICT_RESOLUTION_OVERWRITE || value === CONFLICT_RESOLUTION_GENERATE_NEW_IDS;

interface ImportWorkflowsFlyoutProps {
  onClose: () => void;
}

export const ImportWorkflowsFlyout: React.FC<ImportWorkflowsFlyoutProps> = ({ onClose }) => {
  const { notifications } = useKibana().services;
  const { preflightImportWorkflows, importWorkflows } = useWorkflowActions();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>(
    CONFLICT_RESOLUTION_GENERATE_NEW_IDS
  );

  const preflightResult = preflightImportWorkflows.data ?? null;
  const isCheckingConflicts = preflightImportWorkflows.isLoading;
  const isImporting = importWorkflows.isLoading;

  // Destructure stable function references from mutation objects so that
  // callbacks depending on them are not recreated on every render.
  const { mutate: preflightMutate, reset: preflightReset } = preflightImportWorkflows;
  const { mutate: importMutate, reset: importReset } = importWorkflows;

  const cleanupAndClose = useCallback(() => {
    preflightReset();
    importReset();
    setSelectedFiles(null);
    setFileSizeError(null);
    setConflictResolution(CONFLICT_RESOLUTION_GENERATE_NEW_IDS);
    onClose();
  }, [onClose, preflightReset, importReset]);

  const handleFileChange: EuiFilePickerProps['onChange'] = useCallback(
    (files: FileList | null) => {
      setFileSizeError(null);
      preflightReset();
      setConflictResolution(CONFLICT_RESOLUTION_GENERATE_NEW_IDS);

      if (!files || files.length === 0) {
        setSelectedFiles(null);
        return;
      }

      const file = files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileSizeError(
          i18n.translate('workflows.importFlyout.fileTooLarge', {
            defaultMessage: 'File size exceeds the {maxSize} MB limit.',
            values: { maxSize: MAX_FILE_SIZE_BYTES / MB_SIZE_BYTES },
          })
        );
        setSelectedFiles(null);
        return;
      }

      setSelectedFiles(files);

      preflightMutate(
        { file },
        {
          onError: (error) => {
            const toastError = error instanceof Error ? error : new Error(String(error));
            notifications?.toasts.addError(toastError, {
              title: i18n.translate('workflows.importFlyout.preflightError', {
                defaultMessage: 'Failed to analyze file',
              }),
              toastLifeTimeMs: 5000,
            });
            setSelectedFiles(null);
          },
        }
      );
    },
    [preflightMutate, preflightReset, notifications]
  );

  const handleImport = useCallback(() => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const file = selectedFiles[0];
    const hasConflicts = (preflightResult?.conflicts.length ?? 0) > 0;

    importMutate(
      {
        file,
        overwrite:
          hasConflicts && conflictResolution === CONFLICT_RESOLUTION_OVERWRITE ? true : undefined,
        generateNewIds:
          hasConflicts && conflictResolution === CONFLICT_RESOLUTION_GENERATE_NEW_IDS
            ? true
            : undefined,
      },
      {
        onSuccess: (result) => {
          const { created, failed, parseErrors } = result;

          if (parseErrors.length > 0) {
            notifications?.toasts.addWarning(
              i18n.translate('workflows.importFlyout.parseWarnings', {
                defaultMessage:
                  '{count} {count, plural, one {line was} other {lines were}} skipped due to parse errors.',
                values: { count: parseErrors.length },
              }),
              { toastLifeTimeMs: 5000 }
            );
          }

          if (failed.length === 0) {
            notifications?.toasts.addSuccess(
              i18n.translate('workflows.importFlyout.success', {
                defaultMessage:
                  'Successfully imported {count} {count, plural, one {workflow} other {workflows}}.',
                values: { count: created.length },
              }),
              { toastLifeTimeMs: 5000 }
            );
          } else if (created.length > 0) {
            notifications?.toasts.addWarning(
              i18n.translate('workflows.importFlyout.partialSuccess', {
                defaultMessage:
                  'Imported {createdCount} {createdCount, plural, one {workflow} other {workflows}}. ' +
                  '{failedCount} {failedCount, plural, one {workflow} other {workflows}} failed to import.',
                values: { createdCount: created.length, failedCount: failed.length },
              }),
              { toastLifeTimeMs: 5000 }
            );
          } else {
            notifications?.toasts.addDanger(
              i18n.translate('workflows.importFlyout.failure', {
                defaultMessage:
                  'Failed to import {count} {count, plural, one {workflow} other {workflows}}.',
                values: { count: failed.length },
              }),
              { toastLifeTimeMs: 5000 }
            );
          }

          cleanupAndClose();
        },
        onError: (error) => {
          const toastError = error instanceof Error ? error : new Error(String(error));
          notifications?.toasts.addError(toastError, {
            title: i18n.translate('workflows.importFlyout.error', {
              defaultMessage: 'Failed to import workflows',
            }),
            toastLifeTimeMs: 5000,
          });
        },
      }
    );
  }, [
    selectedFiles,
    preflightResult,
    conflictResolution,
    importMutate,
    notifications,
    cleanupAndClose,
  ]);

  const hasConflicts = (preflightResult?.conflicts.length ?? 0) > 0;
  const canImport = selectedFiles !== null && !isImporting && !isCheckingConflicts;
  const hasWorkflowPreviews = (preflightResult?.workflows?.length ?? 0) > 0;

  const DESCRIPTION_TRUNCATE_LENGTH = 80;

  const previewColumns: Array<EuiBasicTableColumn<WorkflowPreview>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('workflows.importFlyout.preview.nameColumn', {
          defaultMessage: 'Name',
        }),
        render: (name: string | null, item: WorkflowPreview) => (
          <EuiText size="s">{name ?? item.id}</EuiText>
        ),
        width: '30%',
      },
      {
        field: 'description',
        name: i18n.translate('workflows.importFlyout.preview.descriptionColumn', {
          defaultMessage: 'Description',
        }),
        render: (description: string | null) => {
          if (!description) {
            return (
              <EuiText size="s" color="subdued">
                {'\u2014'}
              </EuiText>
            );
          }
          if (description.length > DESCRIPTION_TRUNCATE_LENGTH) {
            const truncated = `${description.slice(0, DESCRIPTION_TRUNCATE_LENGTH)}\u2026`;
            return (
              <EuiToolTip content={description}>
                <EuiText size="s" tabIndex={0}>
                  {truncated}
                </EuiText>
              </EuiToolTip>
            );
          }
          return <EuiText size="s">{description}</EuiText>;
        },
        width: '35%',
      },
      {
        field: 'triggers',
        name: i18n.translate('workflows.importFlyout.preview.triggersColumn', {
          defaultMessage: 'Triggers',
        }),
        render: (triggers: WorkflowPreview['triggers']) => {
          if (triggers.length === 0) {
            return (
              <EuiText size="s" color="subdued">
                {'\u2014'}
              </EuiText>
            );
          }
          return (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {triggers.map((trigger, idx) => (
                <EuiFlexItem grow={false} key={idx}>
                  <EuiBadge color="hollow">{trigger.type}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          );
        },
        width: '20%',
      },
      {
        field: 'inputCount',
        name: i18n.translate('workflows.importFlyout.preview.inputsColumn', {
          defaultMessage: 'Inputs',
        }),
        align: 'right' as const,
        width: '15%',
      },
    ],
    []
  );

  const conflictResolutionOptions = [
    {
      id: CONFLICT_RESOLUTION_GENERATE_NEW_IDS,
      label: i18n.translate('workflows.importFlyout.conflictResolution.generateNewIds', {
        defaultMessage: 'Create as new workflows (generate new IDs)',
      }),
    },
    {
      id: CONFLICT_RESOLUTION_OVERWRITE,
      label: i18n.translate('workflows.importFlyout.conflictResolution.overwrite', {
        defaultMessage: 'Overwrite existing workflows',
      }),
    },
  ];

  const title = i18n.translate('workflows.importFlyout.title', {
    defaultMessage: 'Import workflows',
  });

  return (
    <EuiFlyout
      onClose={cleanupAndClose}
      size="m"
      data-test-subj="importWorkflowsFlyout"
      aria-label={title}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate('workflows.importFlyout.description', {
              defaultMessage:
                'Select a YAML file (.yml) for a single workflow or a ZIP file (.zip) for multiple workflows.',
            })}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFilePicker
          data-test-subj="import-workflows-file-picker"
          id="import-workflows-file-picker"
          accept={ACCEPTED_FILE_TYPES}
          initialPromptText={i18n.translate('workflows.importFlyout.filePickerPrompt', {
            defaultMessage: 'Select or drag a .yml or .zip file',
          })}
          onChange={handleFileChange}
          display="large"
          fullWidth
          isLoading={isImporting || isCheckingConflicts}
          isInvalid={fileSizeError !== null}
          aria-label={i18n.translate('workflows.importFlyout.filePickerAriaLabel', {
            defaultMessage: 'Select workflow files to import',
          })}
        />
        {fileSizeError && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="danger">
              {fileSizeError}
            </EuiText>
          </>
        )}

        {hasWorkflowPreviews && preflightResult && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel paddingSize="s" hasBorder data-test-subj="import-workflows-preview">
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('workflows.importFlyout.preview.title', {
                    defaultMessage: 'Workflows to import ({count})',
                    values: { count: preflightResult.workflows.length },
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <div css={{ maxHeight: 240, overflowY: 'auto' }}>
                <EuiBasicTable<WorkflowPreview>
                  items={preflightResult.workflows}
                  columns={previewColumns}
                  compressed
                  tableLayout="fixed"
                  tableCaption={i18n.translate('workflows.importFlyout.preview.tableCaption', {
                    defaultMessage: 'Preview of workflows to import',
                  })}
                  rowProps={(item) => ({
                    'data-test-subj': `import-preview-row-${item.id}`,
                  })}
                />
              </div>
            </EuiPanel>
          </>
        )}

        {hasConflicts && preflightResult && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={i18n.translate('workflows.importFlyout.conflictsDetected', {
                defaultMessage:
                  '{count} {count, plural, one {workflow already exists} other {workflows already exist}}',
                values: { count: preflightResult.conflicts.length },
              })}
              color="warning"
              iconType="warning"
              data-test-subj="import-workflows-conflicts"
            >
              <EuiText size="s">
                <ul>
                  {preflightResult.conflicts.map((conflict) => (
                    <li key={conflict.id}>{conflict.existingName}</li>
                  ))}
                </ul>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiRadioGroup
                name="importConflictResolution"
                options={conflictResolutionOptions}
                idSelected={conflictResolution}
                onChange={(id) => {
                  if (isConflictResolution(id)) {
                    setConflictResolution(id);
                  }
                }}
                data-test-subj="import-workflows-conflict-resolution"
              />
            </EuiCallOut>
          </>
        )}

        {preflightResult && (preflightResult.parseErrors?.length ?? 0) > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={i18n.translate('workflows.importFlyout.preflightParseErrors', {
                defaultMessage:
                  '{count} {count, plural, one {line was} other {lines were}} skipped due to parse errors',
                values: { count: preflightResult.parseErrors.length },
              })}
              color="warning"
              iconType="warning"
              size="s"
            />
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={cleanupAndClose} data-test-subj="import-workflows-cancel">
              {i18n.translate('workflows.importFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="import-workflows-confirm"
              onClick={handleImport}
              disabled={!canImport}
              fill
              isLoading={isImporting}
            >
              {i18n.translate('workflows.importFlyout.import', {
                defaultMessage: 'Import',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
