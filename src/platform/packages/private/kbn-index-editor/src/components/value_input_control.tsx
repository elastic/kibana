/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, type PropsWithChildren, useCallback, useRef, useEffect } from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPortal,
  EuiFocusTrap,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface EditCellValueProps {
  value: any;
  onSave: (updatedValue: Record<string, any>) => void;
  onCancel: () => void;
}

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
