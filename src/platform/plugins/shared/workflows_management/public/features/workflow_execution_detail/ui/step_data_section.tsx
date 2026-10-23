/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  copyToClipboard,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiPopover,
  EuiToken,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { StepDataValueCell } from './step_data_value_cell';
import { StepDetailAccordionSection } from './step_detail_accordion_section';
import { appendKeyPath } from '../../../shared/lib/flatten_key_paths';
import { isTokenUsageTableField } from '../lib/is_token_usage_table_field';

/** Field column: content-sized between a header-comfortable min and a path-truncation max. */
const FIELD_COLUMN_MIN_PX = 100;
const FIELD_COLUMN_MAX_PX = 160;

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'null';
interface StepDataTableRow {
  field: string;
  value: string;
  fieldType: FieldType;
}

const fieldTypeToToken: Record<FieldType, string> = {
  string: 'tokenString',
  number: 'tokenNumber',
  boolean: 'tokenBoolean',
  array: 'tokenArray',
  null: 'tokenNull',
};

const flattenToRows = (
  value: unknown,
  prefix = ''
): Array<{ field: string; value: string; fieldType: FieldType }> => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return flattenToRows(val, fullKey);
    }
    const fieldType: FieldType =
      val === null ? 'null' : Array.isArray(val) ? 'array' : (typeof val as FieldType);
    const display =
      val === null
        ? 'null'
        : Array.isArray(val)
        ? JSON.stringify(val)
        : typeof val === 'string'
        ? val
        : String(val);
    return [{ field: fullKey, value: display, fieldType }];
  });
};

/** Table view only — AI section owns tokenUsage presentation. JSON view stays raw. */
const filterTokenUsageFromTableRows = <T extends { field: string }>(rows: T[]): T[] =>
  rows.filter((row) => !isTokenUsageTableField(row.field));

const isTableable = (v: unknown): boolean =>
  v !== null &&
  v !== undefined &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(v as object).length > 0;

const SECTION_PAGE_SIZE = 10;

export const StepDataSection = ({
  label,
  data,
  fieldPathPrefix,
  isFieldPathCopyable,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  data: unknown;
  fieldPathPrefix?: string;
  /** Hides copy on rows whose field is not a real template path. Copy is on for all rows if omitted. */
  isFieldPathCopyable?: (field: string) => boolean;
  'data-test-subj'?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const [view, setView] = useState<'table' | 'code'>(() => (isTableable(data) ? 'table' : 'code'));
  const [isViewPopoverOpen, setIsViewPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const hasTable = isTableable(data);
  const effectiveView = hasTable ? view : 'code';

  const rows = useMemo(() => filterTokenUsageFromTableRows(flattenToRows(data)), [data]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(
      (row) => row.field.toLowerCase().includes(term) || row.value.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm]);

  const pageCount = Math.ceil(filteredRows.length / SECTION_PAGE_SIZE);
  const paginatedRows = filteredRows.slice(
    pageIndex * SECTION_PAGE_SIZE,
    (pageIndex + 1) * SECTION_PAGE_SIZE
  );

  const emptyTableMessage =
    searchTerm.trim().length > 0
      ? i18n.translate('workflows.executionFlyout.stepDetail.noFieldsMatch', {
          defaultMessage: 'No fields match',
        })
      : i18n.translate('workflows.executionFlyout.stepDetail.noData', {
          defaultMessage: 'No data',
        });

  const tableColumns = useMemo<Array<EuiBasicTableColumn<StepDataTableRow>>>(
    () => [
      {
        field: 'field',
        name: i18n.translate('workflows.executionFlyout.stepDetail.fieldColumn', {
          defaultMessage: 'Field',
        }),
        className: 'workflowStepDataFieldCol',
        width: `${FIELD_COLUMN_MAX_PX}px`,
        render: (field: string, row) => (
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0,
              maxWidth: FIELD_COLUMN_MAX_PX,
              overflow: 'hidden',
            }}
          >
            <EuiToken
              iconType={fieldTypeToToken[row.fieldType]}
              size="xs"
              css={{ flexShrink: 0, width: '12px', height: '12px', margin: 0 }}
            />
            {/* The tooltip anchors are the flex items: the name's must be able to shrink, and the
                copy button's must not, or a long name pushes the button out of the capped column.
                The name's anchor is a flex container so the span inside can truncate. */}
            <EuiToolTip
              content={field}
              position="top"
              anchorProps={{ css: { display: 'flex', minWidth: 0 } }}
            >
              <span
                tabIndex={0}
                css={{
                  fontSize: '12px',
                  fontFamily: euiTheme.font.familyCode,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  // Truncate from the left so the leaf segment stays visible.
                  direction: 'rtl',
                  textAlign: 'left',
                }}
              >
                <bdi>{field}</bdi>
              </span>
            </EuiToolTip>
            {fieldPathPrefix != null && (isFieldPathCopyable?.(field) ?? true) && (
              <EuiToolTip
                content={i18n.translate('workflows.executionFlyout.stepDetail.copyFieldPath', {
                  defaultMessage: 'Copy field path',
                })}
                disableScreenReaderOutput
                anchorProps={{ css: { flexShrink: 0 } }}
              >
                <EuiButtonIcon
                  iconType="copy"
                  size="xs"
                  color="text"
                  aria-label={i18n.translate('workflows.executionFlyout.stepDetail.copyFieldPath', {
                    defaultMessage: 'Copy field path',
                  })}
                  data-test-subj="workflowExecutionStepDataCopyFieldPath"
                  onClick={() => copyToClipboard(appendKeyPath(fieldPathPrefix, field))}
                />
              </EuiToolTip>
            )}
          </div>
        ),
      },
      {
        field: 'value',
        name: i18n.translate('workflows.executionFlyout.stepDetail.valueColumn', {
          defaultMessage: 'Value',
        }),
        className: 'workflowStepDataValueCol',
        truncateText: true,
        render: (value: string) => <StepDataValueCell value={value} />,
      },
    ],
    [euiTheme.font.familyCode, fieldPathPrefix, isFieldPathCopyable]
  );

  const onTableChange = useCallback(({ page }: Criteria<StepDataTableRow>) => {
    if (page) {
      setPageIndex(page.index);
    }
  }, []);

  return (
    <StepDetailAccordionSection
      title={label}
      data-test-subj={dataTestSubj}
      toggleAriaLabel={i18n.translate('workflows.executionFlyout.stepDetail.toggleNamedSection', {
        defaultMessage: '{label} section',
        values: { label },
      })}
      extraAction={
        hasTable ? (
          <EuiPopover
            aria-label={i18n.translate('workflows.executionFlyout.stepDetail.viewMenuAriaLabel', {
              defaultMessage: 'Data view',
            })}
            isOpen={isViewPopoverOpen}
            closePopover={() => setIsViewPopoverOpen(false)}
            anchorPosition="downRight"
            panelPaddingSize="none"
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="chevronSingleDown"
                iconSide="right"
                data-test-subj="workflowStepDataViewToggle"
                onClick={() => setIsViewPopoverOpen((v) => !v)}
              >
                {effectiveView === 'table'
                  ? i18n.translate('workflows.executionFlyout.stepDetail.tableView', {
                      defaultMessage: 'Table',
                    })
                  : i18n.translate('workflows.executionFlyout.stepDetail.codeView', {
                      defaultMessage: 'JSON',
                    })}
              </EuiButtonEmpty>
            }
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="table"
                  icon={effectiveView === 'table' ? 'check' : 'empty'}
                  onClick={() => {
                    setView('table');
                    setIsViewPopoverOpen(false);
                  }}
                >
                  {i18n.translate('workflows.executionFlyout.stepDetail.tableView', {
                    defaultMessage: 'Table',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="code"
                  icon={effectiveView === 'code' ? 'check' : 'empty'}
                  data-test-subj="workflowViewMode_json"
                  onClick={() => {
                    setView('code');
                    setIsViewPopoverOpen(false);
                  }}
                >
                  {i18n.translate('workflows.executionFlyout.stepDetail.codeView', {
                    defaultMessage: 'JSON',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        ) : undefined
      }
    >
      {effectiveView === 'code' ? (
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          overflowHeight={300}
          isCopyable
          data-test-subj="workflowStepResultJsonCode"
          css={`
            & .euiCodeBlock__controls {
              background: transparent;
              top: 4px;
              right: 4px;
              padding: 2px;
            }

            & .euiCodeBlock__controls .euiButtonIcon {
              background: transparent;
            }
          `}
        >
          {JSON.stringify(data ?? null, null, 2)}
        </EuiCodeBlock>
      ) : (
        <div css={{ minWidth: 0 }}>
          <div css={{ marginBottom: euiTheme.size.m }}>
            <EuiFieldSearch
              compressed
              fullWidth
              placeholder={i18n.translate(
                'workflows.executionFlyout.stepDetail.searchPlaceholder',
                { defaultMessage: 'Search fields and values' }
              )}
              aria-label={i18n.translate('workflows.executionFlyout.stepDetail.searchAriaLabel', {
                defaultMessage: 'Search fields and values',
              })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-test-subj="workflowExecutionStepDataSearch"
            />
          </div>
          <div
            data-test-subj="workflowExecutionStepDataTable"
            css={css`
              min-width: 0;
              width: 100%;
              overflow: hidden;

              .euiTable {
                table-layout: fixed;
                width: 100%;
              }

              .workflowStepDataFieldCol {
                min-width: ${FIELD_COLUMN_MIN_PX}px;
                max-width: ${FIELD_COLUMN_MAX_PX}px;
                width: ${FIELD_COLUMN_MAX_PX}px;
              }

              .workflowStepDataValueCol {
                width: auto;
                overflow: hidden;
              }

              .workflowStepDataValueCol .euiTableCellContent {
                display: block;
                overflow: hidden;
                max-width: 100%;
              }
            `}
          >
            <EuiBasicTable<StepDataTableRow>
              tableCaption={i18n.translate('workflows.executionFlyout.stepDetail.tableCaption', {
                defaultMessage: 'Step data fields',
              })}
              items={paginatedRows}
              columns={tableColumns}
              compressed
              tableLayout="fixed"
              responsiveBreakpoint={false}
              noItemsMessage={emptyTableMessage}
              onChange={onTableChange}
              pagination={
                pageCount > 1
                  ? {
                      pageIndex,
                      pageSize: SECTION_PAGE_SIZE,
                      totalItemCount: filteredRows.length,
                      showPerPageOptions: false,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </StepDetailAccordionSection>
  );
};
