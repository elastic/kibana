/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type FC,
  type PropsWithChildren,
  type FunctionComponent,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';

interface EditCellValueProps {
  value: any;
  onSave: (updatedValue: Record<string, any>) => void;
  onCancel: () => void;
}

export interface ValuePosition {
  row: number;
  col: string;
}

export type OnCellValueChange = (docId: string, update: any) => void;

export const getCellValueRenderer =
  (
    rows: DataTableRecord[],
    editingCell: { row: number | null; col: string | null },
    onEditStart: (update: { row: number | null; col: number | null }) => void,
    onValueChange: OnCellValueChange
  ): FunctionComponent<DataGridCellValueElementProps> =>
  ({ rowIndex, columnId }) => {
    const row = rows[rowIndex];
    const docId = row.id;
    const cellValue = row.flattened[columnId];
    if (cellValue == null) {
      return null;
    }

    const [editValue, setEditValue] = useState(cellValue);

    const isEditing = editingCell.row === rowIndex && editingCell.col === columnId;

    if (isEditing) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <EuiFieldText
            name="test123"
            autoFocus
            placeholder="Placeholder text"
            value={editValue}
            aria-label="Use aria labels when no actual label is in use"
            onChange={(e) => {
              const newValue = e.target.value;
              setEditValue(newValue);
            }}
            onBlur={() => {
              onEditStart({ row: null, col: null });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Submit the value change
                onValueChange(docId, { [columnId]: editValue });
              }
            }}
          />
        </div>
      );
    }
    return (
      <span
        tabIndex={0}
        style={{
          cursor: 'pointer',
        }}
        onClick={() => onEditStart({ row: rowIndex, col: columnId })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEditStart({ row: rowIndex, col: columnId });
        }}
      >
        {cellValue}
      </span>
    );
  };

export const EditCellValue: FC<PropsWithChildren<EditCellValueProps>> = ({
  onCancel,
  onSave,
  value,
}) => {
  const [valueState, setValueState] = React.useState(value);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValueState(e.target.value);
  };

  // return (
  //   <EuiPopover button={ref} isOpen={true} closePopover={onCancel}>
  //     <EuiText css={{ width: 300 }}>
  //       <p>Popover content that&rsquo;s wider than the default width</p>
  //     </EuiText>
  //   </EuiPopover>
  // );

  // return (
  //   <EuiPortal insert={{ sibling: ref.current, position: 'after' }}>
  //     <p>This element is appended immediately after the button.</p>
  //   </EuiPortal>
  // );

  const inputRef = useRef<HTMLInputElement>(null);

  const inputElement = (
    <EuiFieldText
      inputRef={inputRef}
      name="test123"
      autoFocus
      placeholder="Placeholder text"
      value={valueState}
      onChange={onChange}
      aria-label="Use aria labels when no actual label is in use"
    />
  );

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onSave(valueState);
    },
    [onSave, valueState]
  );

  return (
    <EuiForm component="form" onSubmit={onSubmit}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem> {inputElement} </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="success"
            iconType="check"
            iconSize="s"
            display="fill"
            size="s"
            type="submit"
            onClick={onSubmit}
            data-test-subj="editCellValueSaveButton"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="cross"
            iconSize="s"
            display="fill"
            size="s"
            onClick={onCancel}
            data-test-subj="editCellValueCancelButton"
            aria-label={i18n.translate('indexEditor.dataGrid.editCellValueCancel', {
              defaultMessage: 'Cancel',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );

  return (
    <div data-test-subj={'woow'}>
      <EuiForm component="form" onSubmit={onSubmit}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPopover
              panelPaddingSize="xs"
              anchorPosition="rightDown"
              button={inputElement}
              isOpen={true}
              closePopover={onCancel}
              css={{ width: 100 }}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="success"
                    iconType="check"
                    iconSize="s"
                    display="fill"
                    size="s"
                    type="submit"
                    onClick={onSubmit}
                    data-test-subj="editCellValueSaveButton"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="danger"
                    iconType="cross"
                    iconSize="s"
                    display="fill"
                    size="s"
                    onClick={onCancel}
                    data-test-subj="editCellValueCancelButton"
                    aria-label={i18n.translate('indexEditor.dataGrid.editCellValueCancel', {
                      defaultMessage: 'Cancel',
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopover>
          </EuiFlexItem>
          {/* <EuiFlexItem grow={false}>
              <EuiButtonIcon
                type="submit"
                fill
                onClick={onSave}
                data-test-subj="editCellValueSaveButton"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonIcon
                onClick={onCancel}
                data-test-subj="editCellValueCancelButton"
                iconType="cross"
                aria-label={i18n.translate('indexEditor.dataGrid.editCellValueCancel', {
                  defaultMessage: 'Cancel',
                })}
              />
            </EuiFlexItem> */}
        </EuiFlexGroup>
      </EuiForm>
    </div>
  );
};
