/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFormErrorText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ReferenceCapableField } from './reference_capable_field';
import { ReferenceTextInput } from './reference_text_input';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { coerceSingleWord } from '../lib/coerce_single_word';
import { normalizeReferenceForm } from '../lib/reference_value';

interface Row {
  readonly id: number;
  readonly key: string;
  readonly value: unknown;
}

export interface KeyValueJsonCellProps {
  readonly ariaLabel: string;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly onDraftErrorChange: (error: string | undefined) => void;
  readonly testSubj: string;
}

export interface KeyValueFieldProps {
  /** The stored map; anything else is treated as empty. */
  readonly value: unknown;
  readonly onChange: (next: Record<string, unknown>) => void;
  readonly catalog: DataReferenceCatalog;
  readonly fieldLabel: string;
  /** Label of the add button, e.g. "Add variable". */
  readonly addLabel: string;
  readonly testSubj: string;
  /**
   * The values may be of any type: a single word typed in a row is read as YAML reads it (`true`
   * is a boolean, `1` a number), see `coerceSingleWord`. Off for maps whose values are text.
   */
  readonly typedValues?: boolean;
  /**
   * Renders a value that isn't text (a number, a list, a record) as JSON. Injected so this file
   * doesn't import the panel that renders it.
   */
  readonly renderJsonValue: (props: KeyValueJsonCellProps) => React.ReactElement;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** The map the rows stand for: rows without a name, and repeats of a name, are not written. */
const toRecordFromRows = (rows: readonly Row[]): Record<string, unknown> => {
  const seen = new Set<string>();
  const record: Record<string, unknown> = {};
  rows.forEach(({ key, value }) => {
    if (key === '' || seen.has(key)) return;
    seen.add(key);
    record[key] = value;
  });
  return record;
};

const rowsFromRecord = (
  record: Record<string, unknown>,
  nextId: React.MutableRefObject<number>
): Row[] =>
  Object.entries(record).map(([key, entry]) => ({ id: nextId.current++, key, value: entry }));

const sameRecord = (a: Record<string, unknown>, b: Record<string, unknown>): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

interface KeyValueRowProps {
  readonly row: Row;
  readonly index: number;
  readonly isDuplicate: boolean;
  readonly jsonError: string | undefined;
  readonly catalog: DataReferenceCatalog;
  readonly fieldLabel: string;
  readonly nameLabel: string;
  readonly valueLabel: string;
  readonly testSubj: string;
  readonly onKeyChange: (id: number, key: string) => void;
  readonly onTextChange: (id: number, value: string) => void;
  readonly onJsonChange: (id: number, value: unknown) => void;
  readonly onValueBlur: (id: number) => void;
  readonly onRemove: (id: number) => void;
  readonly onJsonErrorChange: (id: number, error: string | undefined) => void;
  /**
   * Only given to a row whose value is not text: the caller's function changes on every render, so
   * a text row, which has no use for it, keeps its memo.
   */
  readonly renderJsonValue: ((props: KeyValueJsonCellProps) => React.ReactElement) | undefined;
}

/**
 * One row. It is memoized, and every callback it gets is stable, so typing in one row does not
 * render the others (each carries a reference picker, chips, a tooltip and icons).
 */
const KeyValueRow = React.memo(function KeyValueRow({
  row,
  index,
  isDuplicate,
  jsonError,
  catalog,
  fieldLabel,
  nameLabel,
  valueLabel,
  testSubj,
  onKeyChange,
  onTextChange,
  onJsonChange,
  onValueBlur,
  onRemove,
  onJsonErrorChange,
  renderJsonValue,
}: KeyValueRowProps) {
  const { euiTheme } = useEuiTheme();
  const removeLabel = i18n.translate('workflows.stepConfigPanel.keyValue.remove', {
    defaultMessage: 'Remove {name}',
    values: { name: row.key || fieldLabel },
  });
  const isText = row.value === undefined || typeof row.value === 'string';
  const error = isDuplicate
    ? i18n.translate('workflows.stepConfigPanel.keyValue.duplicate', {
        defaultMessage: 'Duplicate name "{name}"',
        values: { name: row.key },
      })
    : jsonError;
  return (
    <div data-test-subj={`${testSubj}-row-${index}`}>
      <div css={{ display: 'flex', alignItems: 'flex-start', gap: euiTheme.size.xs }}>
        <div css={{ flex: '0 0 38%', minWidth: 0 }}>
          <EuiFieldText
            compressed
            fullWidth
            aria-label={nameLabel}
            placeholder={i18n.translate('workflows.stepConfigPanel.keyValue.namePlaceholder', {
              defaultMessage: 'name',
            })}
            value={row.key}
            isInvalid={isDuplicate}
            onChange={(event) => onKeyChange(row.id, event.target.value)}
            data-test-subj={`${testSubj}-key-${index}`}
          />
        </div>
        <div css={{ flex: '1 1 auto', minWidth: 0 }}>
          {isText ? (
            <ReferenceCapableField
              catalog={catalog}
              value={typeof row.value === 'string' ? row.value : ''}
              onChange={(next) => onTextChange(row.id, next)}
              openOnBrace
            >
              {(bind) => (
                <ReferenceTextInput
                  bind={bind}
                  catalog={catalog}
                  ariaLabel={valueLabel}
                  isInvalid={false}
                  // A whole reference keeps its type; one inside a sentence is text.
                  onBlur={() => onValueBlur(row.id)}
                  onChange={bind.reportChange}
                  testSubj={`${testSubj}-value-${index}`}
                  warnContainersInSentence={false}
                />
              )}
            </ReferenceCapableField>
          ) : (
            renderJsonValue?.({
              ariaLabel: valueLabel,
              value: row.value,
              onChange: (next) => onJsonChange(row.id, next),
              onDraftErrorChange: (draftError) => onJsonErrorChange(row.id, draftError),
              testSubj: `${testSubj}-value-${index}`,
            })
          )}
        </div>
        <EuiToolTip content={removeLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="trash"
            color="text"
            aria-label={removeLabel}
            onClick={() => onRemove(row.id)}
            data-test-subj={`${testSubj}-remove-${index}`}
          />
        </EuiToolTip>
      </div>
      {error ? <EuiFormErrorText>{error}</EuiFormErrorText> : null}
    </div>
  );
});

/**
 * A map as rows: a name on the left, a value on the right (text with reference chips), plus add
 * and remove. Rows keep their order. A row without a name stays local until it has one, and a
 * repeated name is flagged and not written.
 */
export function KeyValueField({
  value,
  onChange,
  catalog,
  fieldLabel,
  addLabel,
  testSubj,
  typedValues = false,
  renderJsonValue,
}: KeyValueFieldProps) {
  const { euiTheme } = useEuiTheme();
  const nextId = useRef(0);
  const [rows, setRows] = useState<readonly Row[]>(() => rowsFromRecord(toRecord(value), nextId));
  const [jsonErrors, setJsonErrors] = useState<Readonly<Record<number, string | undefined>>>({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const valueRef = useRef(value);
  valueRef.current = value;
  // Cells changed since they were focused: only those get the written-form rule on blur, so
  // clicking into a cell and out again never rewrites what is stored.
  const editedIds = useRef(new Set<number>());
  const typedValuesRef = useRef(typedValues);
  typedValuesRef.current = typedValues;

  // The map changed from outside (YAML view, undo): follow it, unless it is just our own write.
  useEffect(() => {
    if (!sameRecord(toRecordFromRows(rowsRef.current), toRecord(value))) {
      setRows(rowsFromRecord(toRecord(value), nextId));
    }
  }, [value]);

  const update = (nextRows: readonly Row[]) => {
    setRows(nextRows);
    const next = toRecordFromRows(nextRows);
    if (!sameRecord(next, toRecord(valueRef.current))) onChange(next);
  };
  const updateRow = (id: number, patch: Partial<Pick<Row, 'key' | 'value'>>) =>
    update(rowsRef.current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  // Handlers for the rows. They read the latest `update` through refs and never change, which is
  // what lets a row that did not change skip its render.
  const updateRef = useRef(update);
  updateRef.current = update;
  const updateRowRef = useRef(updateRow);
  updateRowRef.current = updateRow;
  const onKeyChange = useCallback(
    (id: number, key: string) => updateRowRef.current(id, { key }),
    []
  );
  const onTextChange = useCallback((id: number, next: string) => {
    editedIds.current.add(id);
    updateRowRef.current(id, { value: next });
  }, []);
  const onJsonChange = useCallback(
    (id: number, next: unknown) => updateRowRef.current(id, { value: next }),
    []
  );
  const onValueBlur = useCallback((id: number) => {
    if (!editedIds.current.delete(id)) return;
    const current = rowsRef.current.find((row) => row.id === id);
    const normalized = normalizeReferenceForm(
      typeof current?.value === 'string' ? current.value : ''
    );
    updateRowRef.current(id, {
      value: typedValuesRef.current ? coerceSingleWord(normalized) : normalized,
    });
  }, []);
  const onRemove = useCallback(
    (id: number) => updateRef.current(rowsRef.current.filter((other) => other.id !== id)),
    []
  );
  const onJsonErrorChange = useCallback(
    (id: number, draftError: string | undefined) =>
      setJsonErrors((current) => ({ ...current, [id]: draftError })),
    []
  );

  const seenKeys = new Set<string>();
  const duplicateIds = new Set<number>();
  rows.forEach(({ id, key }) => {
    if (key !== '' && seenKeys.has(key)) duplicateIds.add(id);
    seenKeys.add(key);
  });

  const nameLabel = i18n.translate('workflows.stepConfigPanel.keyValue.nameLabel', {
    defaultMessage: '{field} name',
    values: { field: fieldLabel },
  });
  const valueLabel = i18n.translate('workflows.stepConfigPanel.keyValue.valueLabel', {
    defaultMessage: '{field} value',
    values: { field: fieldLabel },
  });

  return (
    <div
      css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.s }}
      data-test-subj={testSubj}
    >
      {rows.map((row, index) => (
        <KeyValueRow
          key={row.id}
          row={row}
          index={index}
          isDuplicate={duplicateIds.has(row.id)}
          jsonError={jsonErrors[row.id]}
          catalog={catalog}
          fieldLabel={fieldLabel}
          nameLabel={nameLabel}
          valueLabel={valueLabel}
          testSubj={testSubj}
          onKeyChange={onKeyChange}
          onTextChange={onTextChange}
          onJsonChange={onJsonChange}
          onValueBlur={onValueBlur}
          onRemove={onRemove}
          onJsonErrorChange={onJsonErrorChange}
          renderJsonValue={
            row.value === undefined || typeof row.value === 'string' ? undefined : renderJsonValue
          }
        />
      ))}
      <div>
        <EuiButton
          size="s"
          color="text"
          iconType="plusCircle"
          onClick={() => update([...rowsRef.current, { id: nextId.current++, key: '', value: '' }])}
          data-test-subj={`${testSubj}-add`}
        >
          {addLabel}
        </EuiButton>
      </div>
    </div>
  );
}
