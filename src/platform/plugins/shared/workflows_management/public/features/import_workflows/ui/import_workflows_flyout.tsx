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
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowPreview } from '../../../../common/lib/export';
import type {
  ImportWorkflowsResult,
  PreflightImportResult,
} from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';
import { WorkflowsTriggersList } from '../../../widgets/worflows_triggers_list/worflows_triggers_list';

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

const CONFLICT_RESOLUTION_OPTIONS = [
  {
    value: CONFLICT_RESOLUTION_GENERATE_NEW_IDS,
    text: i18n.translate('workflows.importFlyout.conflictResolution.generateNewIds', {
      defaultMessage: 'Create as new workflows',
    }),
  },
  {
    value: CONFLICT_RESOLUTION_OVERWRITE,
    text: i18n.translate('workflows.importFlyout.conflictResolution.overwrite', {
      defaultMessage: 'Overwrite existing workflows',
    }),
  },
];

interface ImportWorkflowsFlyoutProps {
  onClose: () => void;
}

function ImportWorkflowsCallouts({
  preflightResult,
  hasConflicts,
}: {
  preflightResult: PreflightImportResult | null;
  hasConflicts: boolean;
}) {
  if (preflightResult === null) {
    return null;
  }
  return (
    <>
      {hasConflicts ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            title={i18n.translate('workflows.importFlyout.conflictsDetected', {
              defaultMessage:
                '{count} {count, plural, one {workflow has an ID conflict} other {workflows have ID conflicts}} with existing workflows.',
              values: { count: preflightResult.conflicts.length },
            })}
            color="warning"
            iconType="warning"
            size="s"
            data-test-subj="import-workflows-conflicts"
          />
        </>
      ) : null}

      {(preflightResult.parseErrors?.length ?? 0) > 0 ? (
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
      ) : null}
    </>
  );
}

export const ImportWorkflowsFlyout: React.FC<ImportWorkflowsFlyoutProps> = ({ onClose }) => {
  const { notifications } = useKibana().services;
  const telemetry = useTelemetry();
  const { preflightImportWorkflows, importWorkflows } = useWorkflowActions();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>(
    CONFLICT_RESOLUTION_GENERATE_NEW_IDS
  );
  const [importResult, setImportResult] = useState<ImportWorkflowsResult | null>(null);
  const isImportComplete = importResult !== null;

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
    setImportResult(null);
    onClose();
  }, [onClose, preflightReset, importReset]);

  const handleFileChange: EuiFilePickerProps['onChange'] = useCallback(
    (files: FileList | null) => {
      setFileSizeError(null);
      preflightReset();
      setConflictResolution(CONFLICT_RESOLUTION_GENERATE_NEW_IDS);
      setImportResult(null);

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
    if (!preflightResult?.rawWorkflows?.length) {
      return;
    }

    const hasConflicts = (preflightResult.conflicts.length ?? 0) > 0;

    importMutate(
      {
        workflows: preflightResult.rawWorkflows,
        overwrite:
          hasConflicts && conflictResolution === CONFLICT_RESOLUTION_OVERWRITE ? true : undefined,
        generateNewIds:
          hasConflicts && conflictResolution === CONFLICT_RESOLUTION_GENERATE_NEW_IDS
            ? true
            : undefined,
      },
      {
        onSuccess: (result) => {
          setImportResult(result);
          const workflows = preflightResult.workflows;
          telemetry.reportWorkflowImported({
            workflowCount: preflightResult.totalWorkflows,
            format: preflightResult.format,
            conflictResolution,
            hasConflicts,
            successCount: result.created.length,
            failedCount: result.failed.length,
            minStepCount: Math.min(...workflows.map((w) => w.stepCount)),
            maxStepCount: Math.max(...workflows.map((w) => w.stepCount)),
            minTriggerCount: Math.min(...workflows.map((w) => w.triggers.length)),
            maxTriggerCount: Math.max(...workflows.map((w) => w.triggers.length)),
          });
        },
        onError: (importError) => {
          const toastError =
            importError instanceof Error ? importError : new Error(String(importError));
          notifications?.toasts.addError(toastError, {
            title: i18n.translate('workflows.importFlyout.error', {
              defaultMessage: 'Failed to import workflows',
            }),
            toastLifeTimeMs: 5000,
          });
          const workflows = preflightResult.workflows;
          telemetry.reportWorkflowImported({
            workflowCount: preflightResult.totalWorkflows,
            format: preflightResult.format,
            conflictResolution,
            hasConflicts,
            successCount: 0,
            failedCount: preflightResult.totalWorkflows,
            minStepCount: Math.min(...workflows.map((w) => w.stepCount)),
            maxStepCount: Math.max(...workflows.map((w) => w.stepCount)),
            minTriggerCount: Math.min(...workflows.map((w) => w.triggers.length)),
            maxTriggerCount: Math.max(...workflows.map((w) => w.triggers.length)),
            error: toastError,
          });
        },
      }
    );
  }, [preflightResult, conflictResolution, importMutate, notifications, telemetry]);

  const hasConflicts = (preflightResult?.conflicts.length ?? 0) > 0;
  const canImport = selectedFiles !== null && !isImporting && !isCheckingConflicts;
  const hasWorkflowPreviews = (preflightResult?.workflows?.length ?? 0) > 0;

  const conflictIds = useMemo(
    () => new Set(preflightResult?.conflicts.map((c) => c.id) ?? []),
    [preflightResult?.conflicts]
  );

  const importStatusMap = useMemo(() => {
    if (!importResult || !preflightResult) return new Map<string, 'success' | 'failed'>();
    const failedIndices = new Set(importResult.failed.map((f) => f.index));
    const failedIds = new Set(importResult.failed.map((f) => f.id));
    const map = new Map<string, 'success' | 'failed'>();
    preflightResult.workflows.forEach((w, idx) => {
      const isFailed = failedIndices.has(idx) || failedIds.has(w.id);
      map.set(w.id, isFailed ? 'failed' : 'success');
    });
    return map;
  }, [importResult, preflightResult]);

  const previewColumns: Array<EuiBasicTableColumn<WorkflowPreview>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('workflows.importFlyout.preview.nameColumn', {
          defaultMessage: 'Name',
        }),
        render: (name: string | null, item: WorkflowPreview) => (
          <div
            css={css`
              max-width: 100%;
              overflow: hidden;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiText
                  size="s"
                  css={css`
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                  title={name ?? item.id}
                >
                  {name ?? item.id}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                  title={item.description ?? undefined}
                >
                  {item.description || '\u2014'}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      },
      {
        field: 'triggers',
        name: i18n.translate('workflows.importFlyout.preview.triggersColumn', {
          defaultMessage: 'Triggers',
        }),
        render: (triggers: WorkflowPreview['triggers']) => (
          <WorkflowsTriggersList triggers={triggers} />
        ),
        width: '25%',
      },
      {
        field: 'inputCount',
        name: i18n.translate('workflows.importFlyout.preview.inputsColumn', {
          defaultMessage: 'Inputs',
        }),
        align: 'right' as const,
        width: '10%',
      },
      {
        field: 'stepCount',
        name: i18n.translate('workflows.importFlyout.preview.stepsColumn', {
          defaultMessage: 'Steps',
        }),
        align: 'right' as const,
        width: '10%',
      },
      {
        field: 'id',
        name: i18n.translate('workflows.importFlyout.preview.statusColumn', {
          defaultMessage: 'Status',
        }),
        width: '70px',
        align: 'right',
        render: (id: string) => {
          if (isImportComplete) {
            const status = importStatusMap.get(id);
            if (status === 'success') {
              return (
                <EuiIcon
                  type="checkInCircleFilled"
                  color="success"
                  data-test-subj={`import-preview-success-${id}`}
                  aria-label={i18n.translate('workflows.importFlyout.preview.successIcon', {
                    defaultMessage: 'Imported successfully',
                  })}
                />
              );
            }
            if (status === 'failed') {
              return (
                <EuiIcon
                  type="crossInACircleFilled"
                  color="danger"
                  data-test-subj={`import-preview-failed-${id}`}
                  aria-label={i18n.translate('workflows.importFlyout.preview.failedIcon', {
                    defaultMessage: 'Import failed',
                  })}
                />
              );
            }
            return null;
          }
          return conflictIds.has(id) ? (
            <EuiIconTip
              type="warning"
              color="warning"
              content={i18n.translate('workflows.importFlyout.preview.conflictTooltip', {
                defaultMessage:
                  'A workflow with this ID already exists and will be affected by the chosen conflict resolution strategy.',
              })}
              iconProps={{
                'data-test-subj': `import-preview-conflict-${id}`,
              }}
              aria-label={i18n.translate('workflows.importFlyout.preview.conflictIcon', {
                defaultMessage: 'ID conflict',
              })}
            />
          ) : null;
        },
      },
    ],
    [conflictIds, isImportComplete, importStatusMap]
  );

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
          disabled={isImportComplete}
          isLoading={!isImportComplete && (isImporting || isCheckingConflicts)}
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
        <ImportWorkflowsCallouts preflightResult={preflightResult} hasConflicts={hasConflicts} />

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
              <div css={{ overflowY: 'auto' }}>
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
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {isImportComplete ? (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton onClick={cleanupAndClose} data-test-subj="import-workflows-close">
                {i18n.translate('workflows.importFlyout.close', {
                  defaultMessage: 'Close',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={cleanupAndClose} data-test-subj="import-workflows-cancel">
                {i18n.translate('workflows.importFlyout.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    data-test-subj="import-workflows-conflict-resolution"
                    options={CONFLICT_RESOLUTION_OPTIONS}
                    value={conflictResolution}
                    onChange={(e) => {
                      if (isConflictResolution(e.target.value)) {
                        setConflictResolution(e.target.value);
                      }
                    }}
                    compressed
                    prepend={i18n.translate('workflows.importFlyout.conflictResolution.label', {
                      defaultMessage: 'On conflicts',
                    })}
                    aria-label={i18n.translate(
                      'workflows.importFlyout.conflictResolution.ariaLabel',
                      { defaultMessage: 'Conflict resolution strategy' }
                    )}
                  />
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
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
