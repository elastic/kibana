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
  EuiSplitPanel,
  euiDragDropReorder,
  useEuiPaddingCSS,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { OnDragEndResponder } from '@hello-pangea/dnd';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FixedSizeList } from 'react-window';
import { v4 as uuidv4, NIL as UUID_NIL } from 'uuid';
import { omit } from 'lodash';
import { SuggestionsBox } from './suggestions_box';

interface Props {
  idAria?: string;
  [key: string]: unknown;
  maxOptions?: number;
  label: string;
  value: ListOptionsInputOption[];
  onChange: (options: ListOptionsInputOption[]) => void;
  suggestions: string[];
}

export interface ListOptionsInputOption {
  value: string;
  text: string;
  isFresh?: boolean;
}

const DRAG_DROP_ITEM_LIMIT = 50;
const MAX_HEIGHT = 350;

export const INITIAL_OPTIONS: ListOptionsInputOption[] = [
  {
    // Key used to identify the initial default option
    // String literal 'default' is not used to avoid confusion in case the user changes the
    // default value to a different option,
    value: UUID_NIL, // '00000000-0000-0000-0000-000000000000'
    text: '',
  },
];

/**
 * Render a list options configuration UI, with:
 * - Drag and drop reordering at 50 items or less
 * - Virtualization through react-window at more than 50 items, and no drag-drop ordering (incompatible with virtualization)
 */
export const ListOptionsInput = ({
  value,
  label,
  idAria,
  maxOptions,
  onChange,
  suggestions,
}: Props) => {
  // Add a state to track if an option has just been created. This is used to auto-focus the input.
  const [freshOption, setFreshOption] = useState<ListOptionsInputOption | null>(null);
  const [nextSortDir, setNextSortDir] = useState<'asc' | 'desc'>('desc');

  const virtualizedScrollList = useRef<FixedSizeList>(null);
  const virtualizedListWrapperRef = useRef<HTMLSpanElement>(null);
  const virtualizedScrollListOuterRef = useRef<HTMLDivElement>(null);
  const standardListWrapperRef = useRef<HTMLDivElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);

  // Track changes in virtualized mode, and queue them up for commit. This is to avoid a change in the `value` prop,
  // which triggers a re-render, until the user is no longer interacting with the virtualized list.
  const virtualizedChangesSet = useRef<Map<string, string>>(new Map([]));

  const currentOptions: ListOptionsInputOption[] = useMemo(() => {
    const parsedValue = value.length ? value : [...INITIAL_OPTIONS];
    if (freshOption) {
      parsedValue.push(freshOption);
    }
    return parsedValue;
  }, [value, freshOption]);
  const renderingInVirtualizedMode = useMemo(
    () => currentOptions.length > DRAG_DROP_ITEM_LIMIT,
    [currentOptions]
  );

  const onChangeOptionLabel = useCallback(
    ({ value: key, text }: ListOptionsInputOption) => {
      if (renderingInVirtualizedMode) {
        virtualizedChangesSet.current.set(String(key), text);
        return;
      }
      if (freshOption) setFreshOption(null);
      const newOptions = currentOptions.map((option) =>
        key === option.value ? { value: key, text } : omit(option, 'isFresh')
      );
      onChange(newOptions);
    },
    [currentOptions, freshOption, onChange, renderingInVirtualizedMode]
  );

  const onChooseSuggestion = useCallback(
    (key: string, suggestion: string) => {
      if (key) onChangeOptionLabel({ value: key, text: suggestion });
    },
    [onChangeOptionLabel]
  );

  const commitVirtualizedChanges = useCallback(() => {
    const newOptions = currentOptions.map((option) => {
      const newText = virtualizedChangesSet.current.get(String(option.value));
      return newText ? { ...option, text: newText } : omit(option, 'isFresh');
    });
    virtualizedChangesSet.current.clear();
    onChange(newOptions);
  }, [currentOptions, onChange]);

  const onBlurVirtualizedList = useCallback(
    (e: React.FocusEvent) => {
      // Check to see if the event bubbled up from an element within the list, or within the suggestions box portal
      if (
        virtualizedListWrapperRef.current?.contains(e.relatedTarget) ||
        suggestionsBoxRef.current?.contains(e.relatedTarget)
      )
        return;
      if (freshOption) setFreshOption(null);
      commitVirtualizedChanges();
    },
    [freshOption, commitVirtualizedChanges]
  );

  const onAddOption = useCallback(() => {
    if (maxOptions && currentOptions.length >= maxOptions) return;
    const newOption = { value: uuidv4(), text: '', isFresh: true };
    setFreshOption(newOption);
    virtualizedScrollList.current?.scrollToItem(currentOptions.length + 1, 'end');
  }, [maxOptions, currentOptions]);

  const onRemoveOption = useCallback(
    (key: ListOptionsInputOption['value']) => {
      setFreshOption(null);
      const newOptions = currentOptions.filter((option) => option.value !== key);
      onChange(newOptions);
    },
    [currentOptions, onChange]
  );

  const onClearAll = useCallback(() => {
    virtualizedChangesSet.current.clear();
    setFreshOption(null);
    onChange([]);
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
    (option: ListOptionsInputOption, index: number) => {
      return (
        <ListOption
          option={option}
          index={index}
          renderingInVirtualizedMode={renderingInVirtualizedMode}
          onChange={(e) => {
            onChangeOptionLabel({ value: String(option.value), text: e.target.value });
          }}
          onKeyDown={(e) => {
            if (!e.defaultPrevented && e.key === 'Enter') {
              commitVirtualizedChanges();
              onAddOption();
            }
          }}
          onRemoveOption={onRemoveOption}
          canRemoveOption={currentOptions.length > 1}
          suggestions={suggestions}
          onChooseSuggestion={onChooseSuggestion}
          refs={{
            suggestionsBoxRef,
            virtualizedScrollListOuterRef,
            standardListWrapperRef,
          }}
        />
      );
    },
    [
      renderingInVirtualizedMode,
      onRemoveOption,
      currentOptions.length,
      suggestions,
      onChooseSuggestion,
      onChangeOptionLabel,
      commitVirtualizedChanges,
      onAddOption,
    ]
  );
  const paddingLeftCSS = useEuiPaddingCSS('left');
  const listBody = !renderingInVirtualizedMode ? (
    <EuiSplitPanel.Inner
      paddingSize="none"
      css={css`
        max-height: ${MAX_HEIGHT}px;
        overflow-y: auto;
      `}
      panelRef={standardListWrapperRef}
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
    <span ref={virtualizedListWrapperRef} onBlur={onBlurVirtualizedList}>
      <EuiSplitPanel.Inner paddingSize="xs" css={paddingLeftCSS.xl}>
        <FixedSizeList
          width="100%"
          height={MAX_HEIGHT}
          itemCount={currentOptions.length}
          itemSize={40}
          itemData={currentOptions}
          ref={virtualizedScrollList}
          outerRef={virtualizedScrollListOuterRef}
        >
          {({ data, index, style }) => (
            <EuiFlexGroup alignItems="center" gutterSize="s" style={style}>
              {renderOption(data[index], index)}
            </EuiFlexGroup>
          )}
        </FixedSizeList>
      </EuiSplitPanel.Inner>
    </span>
  );

  return (
    <EuiFormRow fullWidth describedByIds={idAria ? [idAria] : undefined} label={label}>
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
                    {i18n.translate('controls.listOptionsInput.addOption', {
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
                      {i18n.translate('controls.listOptionsInput.sort', {
                        defaultMessage: 'Sort',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty color="danger" iconType="trash" onClick={onClearAll}>
                      {i18n.translate('controls.listOptionsInput.clearAll', {
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

const ListOption: React.FC<{
  option: ListOptionsInputOption;
  index: number;
  renderingInVirtualizedMode: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown: React.KeyboardEventHandler;
  onRemoveOption: (option: string) => void;
  canRemoveOption: boolean;
  suggestions: string[];
  onChooseSuggestion: (key: string, suggestion: string) => void;
  refs: {
    suggestionsBoxRef: React.RefObject<HTMLDivElement>;
    virtualizedScrollListOuterRef: React.RefObject<HTMLDivElement>;
    standardListWrapperRef: React.RefObject<HTMLDivElement>;
  };
}> = ({
  option,
  index,
  renderingInVirtualizedMode,
  onChange,
  onKeyDown,
  onRemoveOption,
  canRemoveOption,
  suggestions,
  onChooseSuggestion,
  refs: { suggestionsBoxRef, virtualizedScrollListOuterRef, standardListWrapperRef },
}) => {
  const [inFocus, setInFocus] = useState(!renderingInVirtualizedMode && option.isFresh);
  const inputFieldRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <EuiFlexItem>
        <EuiFieldText
          inputRef={inputFieldRef}
          compressed
          autoFocus={!renderingInVirtualizedMode && option.isFresh}
          fullWidth
          defaultValue={
            /** Virtualizing breaks focus on re-render, so render as an uncontrolled component */
            renderingInVirtualizedMode ? String(option.text) : undefined
          }
          value={!renderingInVirtualizedMode ? String(option.text) : undefined}
          placeholder={i18n.translate('controls.listOptionsInput.placeholderText', {
            defaultMessage: 'Option text',
          })}
          onChange={onChange}
          onBlur={(e) => {
            // If this blur was triggered by clicking a suggestion, defer to the click handler
            if (suggestionsBoxRef.current?.contains(e.relatedTarget)) return;
            setInFocus(false);
          }}
          onFocus={() => setInFocus(true)}
          onKeyDown={onKeyDown}
          data-test-subj={`list-options-input-option-label-${index}`}
        />
      </EuiFlexItem>
      {canRemoveOption && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType={'minusInCircle'}
            color={'danger'}
            onClick={() => onRemoveOption(option.value)}
            data-test-subj={`list-options-input-remove-option-${index}`}
          />
        </EuiFlexItem>
      )}
      {inFocus && (
        <SuggestionsBox
          suggestions={suggestions}
          inputField={inputFieldRef.current}
          onChoose={(suggestion) => onChooseSuggestion(option.value, suggestion)}
          innerRef={suggestionsBoxRef}
          scrollListRef={
            renderingInVirtualizedMode ? virtualizedScrollListOuterRef : standardListWrapperRef
          }
        />
      )}
    </>
  );
};
