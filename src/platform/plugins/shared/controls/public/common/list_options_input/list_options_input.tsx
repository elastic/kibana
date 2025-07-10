/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelectOption,
  EuiSplitPanel,
  euiDragDropReorder,
} from '@elastic/eui';
import type { OnDragEndResponder } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { v4 as uuidv4, NIL as UUID_NIL } from 'uuid';

interface Props {
  idAria?: string;
  [key: string]: unknown;
  maxOptions?: number;
  label: string;
  helpText?: string;
  value: EuiSelectOption[];
  onChange: (options: EuiSelectOption[]) => void;
  isInvalid?: boolean;
  error?: ReactNode;
}

type ListOptionsInputOption = EuiSelectOption & { isFresh?: boolean };

export const INITIAL_OPTIONS: EuiSelectOption[] = [
  {
    // Key used to identify the initial default option
    // String literal 'default' is not used to avoid confusion in case the user changes the
    // default value to a different option,
    value: UUID_NIL, // '00000000-0000-0000-0000-000000000000'
    text: '',
  },
];

const ListOptionsInputComponent = ({
  value,
  helpText,
  label,
  idAria,
  maxOptions,
  onChange,
  isInvalid,
  error,
  ...rest
}: Props) => {
  // Add a state to track if an option has just been created. This is used to auto-focus the input, and to prevent
  // any validation errors from appearing until after the user has entered a value or blurred the input
  const [freshOption, setFreshOption] = useState<ListOptionsInputOption | null>(null);

  const currentOptions: ListOptionsInputOption[] = useMemo(() => {
    const parsedValue = value.length ? value : INITIAL_OPTIONS;
    if (freshOption) parsedValue.push(freshOption);
    return Array.isArray(parsedValue) ? parsedValue : INITIAL_OPTIONS;
  }, [value, freshOption]);

  useEffectOnce(() => {
    if (!isEqual(currentOptions, INITIAL_OPTIONS)) {
      onChange(currentOptions);
    }
  });

  const onChangeOptionLabel = useCallback(
    ({ value: key, text }: ListOptionsInputOption) => {
      setFreshOption(null);
      const newOptions = currentOptions.map((option) =>
        key === option.value ? { value: key, text } : option
      );
      onChange(newOptions);
    },
    [currentOptions, onChange]
  );

  const onAddOption = useCallback(() => {
    if (maxOptions && currentOptions.length >= maxOptions) return;
    const newOption = { value: uuidv4(), text: '', isFresh: true };
    setFreshOption(newOption);
  }, [maxOptions, currentOptions]);

  const onRemoveOption = useCallback(
    (key: EuiSelectOption['value']) => {
      const newOptions = currentOptions.filter((option) => option.value !== key);
      onChange(newOptions);
    },
    [currentOptions, onChange]
  );

  const onBlurOption = useCallback(
    (option: ListOptionsInputOption) => {
      if (option.isFresh) {
        onChangeOptionLabel(option);
      }
    },
    [onChangeOptionLabel]
  );

  const onDragEnd = useCallback<OnDragEndResponder>(
    ({ source, destination }) => {
      if (source && destination) {
        setFreshOption(null);
        const newOptions = euiDragDropReorder(currentOptions, source.index, destination.index);
        onChange(newOptions);
      }
    },
    [currentOptions, onChange]
  );

  return (
    <EuiFormRow
      helpText={helpText}
      error={error}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      label={label}
      {...rest}
    >
      <EuiSplitPanel.Outer hasBorder>
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="OPTIONS_DROPPABLE_AREA" spacing="m">
            {currentOptions.map((option, index) => (
              <EuiDraggable
                spacing="s"
                key={`option-${option.value}`}
                draggableId={`option-${option.value}`}
                index={index}
                customDragHandle
                hasInteractiveChildren
              >
                {(provided) => (
                  <EuiSplitPanel.Inner key={index} paddingSize="none">
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiPanel
                          color="transparent"
                          paddingSize="s"
                          {...provided.dragHandleProps}
                          aria-label="Drag Handle"
                        >
                          <EuiIcon type="grab" />
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFieldText
                          compressed
                          autoFocus={option.isFresh}
                          fullWidth
                          value={String(option.text)}
                          placeholder={i18n.translate('optionsfield.placeholderText', {
                            defaultMessage: 'Option text',
                          })}
                          onChange={(e) =>
                            onChangeOptionLabel({ value: option.value, text: e.target.value })
                          }
                          onBlur={() => onBlurOption(option)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onBlurOption(option);
                              onAddOption();
                            }
                          }}
                          data-test-subj={`list-options-input-option-label-${index}`}
                        />
                      </EuiFlexItem>
                      {currentOptions.length > 1 && (
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            iconType={'minusInCircle'}
                            color={'danger'}
                            onClick={() => onRemoveOption(option.value)}
                            data-test-subj={`list-options-input-remove-option-${index}`}
                          />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiSplitPanel.Inner>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
        {(!maxOptions || currentOptions.length < maxOptions) && (
          <EuiSplitPanel.Inner color="subdued" paddingSize="none">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButtonEmpty
                  iconType={'plusInCircle'}
                  onClick={onAddOption}
                  data-test-subj="list-options-input-add-option"
                >
                  {i18n.translate('optionsfield.addOption', {
                    defaultMessage: 'Add option',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
        )}
      </EuiSplitPanel.Outer>
    </EuiFormRow>
  );
};

ListOptionsInputComponent.displayName = 'ListOptionsInput';

export const ListOptionsInput = React.memo(ListOptionsInputComponent);
