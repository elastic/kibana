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
  useEuiPaddingCSS,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { OnDragEndResponder } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { FixedSizeList } from 'react-window';
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

const DRAG_DROP_ITEM_LIMIT = 50;
const MAX_HEIGHT = 350;

export const INITIAL_OPTIONS: EuiSelectOption[] = [
  {
    // Key used to identify the initial default option
    // String literal 'default' is not used to avoid confusion in case the user changes the
    // default value to a different option,
    value: UUID_NIL, // '00000000-0000-0000-0000-000000000000'
    text: '',
  },
];

export const ListOptionsInput = ({
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
  const [nextSortDir, setNextSortDir] = useState<'asc' | 'desc'>('desc');
  const scrollListRef = useRef<FixedSizeList>(null);

  const currentOptions: ListOptionsInputOption[] = useMemo(() => {
    const parsedValue = value.length ? value : INITIAL_OPTIONS;
    if (freshOption) parsedValue.push(freshOption);
    return parsedValue;
  }, [value, freshOption]);
  const renderingInVirtualizedMode = useMemo(
    () => currentOptions.length > DRAG_DROP_ITEM_LIMIT,
    [currentOptions]
  );

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
    scrollListRef.current?.scrollToItem(currentOptions.length, 'end');
  }, [maxOptions, currentOptions]);

  const onRemoveOption = useCallback(
    (key: EuiSelectOption['value']) => {
      const newOptions = currentOptions.filter((option) => option.value !== key);
      onChange(newOptions);
    },
    [currentOptions, onChange]
  );

  const onClearAll = useCallback(() => {
    onChange([]);
    setFreshOption(null);
  }, [onChange]);
  const onSort = useCallback(() => {
    const nextOptions = (value ?? INITIAL_OPTIONS).sort((a, b) => {
      if (a.text === b.text) return 0;
      const aGreater = (a.text ?? '') > (b.text ?? '');
      if (nextSortDir === 'desc') {
        return aGreater ? 1 : -1;
      }
      return aGreater ? -1 : 1;
    });
    onChange(nextOptions);
    setFreshOption(null);
    setNextSortDir(nextSortDir === 'asc' ? 'desc' : 'asc');
  }, [value, onChange, nextSortDir]);

  const onBlurOption = useCallback(
    (option: ListOptionsInputOption) => {
      if (option.isFresh && !renderingInVirtualizedMode) {
        onChangeOptionLabel(option);
      }
    },
    [onChangeOptionLabel, renderingInVirtualizedMode]
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

  const showAddOption = useMemo(
    () => !maxOptions || currentOptions.length < maxOptions,
    [maxOptions, currentOptions.length]
  );
  const showActions = useMemo(() => currentOptions.length >= 6, [currentOptions.length]);

  const renderOption = useCallback(
    (option: ListOptionsInputOption, index: number) => (
      <>
        <EuiFlexItem>
          <EuiFieldText
            compressed
            autoFocus={option.isFresh}
            fullWidth
            defaultValue={String(option.text)}
            placeholder={i18n.translate('optionsfield.placeholderText', {
              defaultMessage: 'Option text',
            })}
            onChange={
              !renderingInVirtualizedMode
                ? (e) => onChangeOptionLabel({ value: option.value, text: e.target.value })
                : undefined
            }
            onBlur={(e) => {
              if (renderingInVirtualizedMode) {
                onChangeOptionLabel({ value: option.value, text: e.target.value });
              } else {
                onBlurOption(option);
              }
            }}
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
      </>
    ),
    [
      currentOptions.length,
      onAddOption,
      onBlurOption,
      onChangeOptionLabel,
      onRemoveOption,
      renderingInVirtualizedMode,
    ]
  );
  const paddingLeftCSS = useEuiPaddingCSS('left');
  const listBody =
    currentOptions.length <= DRAG_DROP_ITEM_LIMIT ? (
      <EuiSplitPanel.Inner
        paddingSize="none"
        css={css`
          max-height: ${MAX_HEIGHT}px;
          overflow-y: auto;
        `}
      >
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="OPTIONS_DROPPABLE_AREA" spacing="s">
            {currentOptions.map((option, index) => (
              <EuiDraggable
                spacing="s"
                key={`option-${option.value}`}
                draggableId={`option-${option.value}`}
                index={index}
                customDragHandle
                hasInteractiveChildren
                usePortal
              >
                {(provided) => (
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
                    {renderOption(option, index)}
                  </EuiFlexGroup>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
      </EuiSplitPanel.Inner>
    ) : (
      <EuiSplitPanel.Inner paddingSize="xs" css={paddingLeftCSS.xl}>
        <FixedSizeList
          width="100%"
          height={MAX_HEIGHT}
          itemCount={currentOptions.length}
          itemSize={40}
          itemData={currentOptions}
          ref={scrollListRef}
        >
          {({ data, index, style }) => (
            <EuiFlexGroup alignItems="center" gutterSize="s" style={style}>
              {renderOption(data[index], index)}
            </EuiFlexGroup>
          )}
        </FixedSizeList>
      </EuiSplitPanel.Inner>
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
        {listBody}
        {(showAddOption || showActions) && (
          <EuiSplitPanel.Inner color="subdued" paddingSize="none">
            <EuiFlexGroup>
              {showAddOption && (
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
              )}
              {showActions && (
                <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType={nextSortDir === 'asc' ? 'sortAscending' : 'sortDescending'}
                      onClick={onSort}
                    >
                      {i18n.translate('optionsfield.sort', {
                        defaultMessage: 'Sort',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty color="danger" iconType="trash" onClick={onClearAll}>
                      {i18n.translate('optionsfield.clearAll', {
                        defaultMessage: 'Clear all',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
        )}
      </EuiSplitPanel.Outer>
    </EuiFormRow>
  );
};
