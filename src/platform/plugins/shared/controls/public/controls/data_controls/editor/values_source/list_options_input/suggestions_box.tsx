/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiPanel,
  EuiListGroup,
  EuiListGroupItem,
  EuiPortal,
  useEuiTheme,
  EuiHighlight,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Reducer, useCallback, useEffect, useReducer, useState } from 'react';
import { Subject, debounceTime } from 'rxjs';

/**
 * EuiInputPopover is not compatible with react-window virtualized items, so use this custom
 * component to render the suggestions box on the focused field
 */
interface Props {
  innerRef: React.RefObject<HTMLDivElement>;
  inputField: HTMLInputElement | null;
  suggestions: string[];
  onChoose: (s: string) => void;
  scrollListRef: React.RefObject<HTMLElement>;
}

const SET_NEXT_SUGGESTION = 'SET_NEXT_SUGGESTION';
const SET_PREV_SUGGESTION = 'SET_PREV_SUGGESTION';
const SET_INPUT_FIELD_VALUE = 'SET_INPUT_FIELD_VALUE';
const CLEAR_STATE = 'CLEAR_STATE';
interface SuggestionsBoxState {
  activeSuggestionIndex: number | null;
  displayedSuggestions: string[];
  inputFieldValue: string;
}
type SuggestionsBoxAction =
  | {
      type: typeof SET_INPUT_FIELD_VALUE;
      value: string;
    }
  | {
      type: typeof SET_NEXT_SUGGESTION | typeof SET_PREV_SUGGESTION | typeof CLEAR_STATE;
    };
const filterSuggestionsByInputFieldValue = (suggestions: string[], inputFieldValue: string) => {
  if (inputFieldValue === '') return suggestions;
  const inputFirstSuggestions = [];
  const otherSuggestions = [];
  const lowercaseValue = inputFieldValue.toLowerCase();

  for (const suggestion of suggestions) {
    const lowercaseSuggestion = suggestion.toLowerCase();
    if (!lowercaseSuggestion.includes(lowercaseValue) || suggestion === inputFieldValue) continue;
    if (lowercaseSuggestion.startsWith(lowercaseValue)) {
      inputFirstSuggestions.push(suggestion);
    } else {
      otherSuggestions.push(suggestion);
    }
  }
  return [...inputFirstSuggestions.sort(), ...otherSuggestions.sort()];
};

export const SuggestionsBox = ({
  suggestions,
  onChoose,
  innerRef,
  scrollListRef,
  inputField,
}: Props) => {
  const [{ activeSuggestionIndex, displayedSuggestions }, dispatch] = useReducer<
    Reducer<SuggestionsBoxState, SuggestionsBoxAction>
  >(
    (state, action) => {
      switch (action.type) {
        case SET_INPUT_FIELD_VALUE:
          if (action.value && state.inputFieldValue === action.value) return state;
          const nextSuggestions = filterSuggestionsByInputFieldValue(suggestions, action.value);
          return {
            inputFieldValue: action.value,
            activeSuggestionIndex:
              state.activeSuggestionIndex !== null
                ? Math.max(
                    0,
                    Math.min(nextSuggestions.length - 1, state.activeSuggestionIndex ?? 0)
                  )
                : null,
            displayedSuggestions: nextSuggestions,
          };
        case SET_NEXT_SUGGESTION:
          return {
            ...state,
            activeSuggestionIndex:
              state.activeSuggestionIndex === null
                ? 0
                : Math.min(state.activeSuggestionIndex + 1, state.displayedSuggestions.length),
          };
        case SET_PREV_SUGGESTION:
          return {
            ...state,
            activeSuggestionIndex:
              state.activeSuggestionIndex === null
                ? 0
                : Math.max(state.activeSuggestionIndex - 1, 0),
          };
        case CLEAR_STATE:
          return {
            displayedSuggestions: [],
            inputFieldValue: '',
            activeSuggestionIndex: null,
          };
      }
    },
    {
      activeSuggestionIndex: null,
      inputFieldValue: inputField?.value ?? '',
      displayedSuggestions: filterSuggestionsByInputFieldValue(
        suggestions,
        inputField?.value ?? ''
      ),
    }
  );

  const [fieldRect, setFieldRect] = useState<DOMRect | undefined>(
    inputField?.getBoundingClientRect()
  );

  const setInputFieldValue = useCallback(
    (value: string) => dispatch({ type: SET_INPUT_FIELD_VALUE, value }),
    [dispatch]
  );
  const onChooseSuggestion = useCallback(
    (suggestion: string) => {
      if (!inputField) return;
      inputField.value = suggestion;
      inputField.focus();
      onChoose(suggestion);
      dispatch({ type: SET_INPUT_FIELD_VALUE, value: suggestion });
    },
    [onChoose, inputField]
  );
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) {
        e.preventDefault();
        if (e.key === 'ArrowDown') {
          dispatch({ type: SET_NEXT_SUGGESTION });
        } else if (e.key === 'ArrowUp') {
          dispatch({ type: SET_PREV_SUGGESTION });
        }
      } else if (
        e.key === 'Enter' &&
        activeSuggestionIndex !== null &&
        displayedSuggestions[activeSuggestionIndex]
      ) {
        e.preventDefault();
        onChooseSuggestion(displayedSuggestions[activeSuggestionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: CLEAR_STATE });
      }
    },
    [activeSuggestionIndex, displayedSuggestions, onChooseSuggestion]
  );

  useEffect(() => {
    setFieldRect(inputField?.getBoundingClientRect());
  }, [inputField]);
  useEffect(() => {
    // When keydown listener changes, unbind the previous and rebind the new one
    if (inputField) {
      const keyUpEvent$ = new Subject<KeyboardEvent>();
      // Debounce the keydown event and update the stored input field value; debounce is used to prevent race conditions
      // e.g. pressing the Shift key and then typing a letter
      // Binding this behavior to the keydown event doesn't work correctly outside of virtualized mode due to re-rendering
      const debouncedKeydownSubscription = keyUpEvent$.pipe(debounceTime(10)).subscribe((e) => {
        if (!['Tab', 'Escape'].includes(e.key)) setInputFieldValue(inputField.value);
      });
      const keyUpListener = (e: KeyboardEvent) => {
        keyUpEvent$.next(e);
      };
      inputField.addEventListener('keydown', onKeyDown);
      inputField.addEventListener('keyup', keyUpListener);
      return () => {
        inputField.removeEventListener('keydown', onKeyDown);
        inputField.removeEventListener('keyup', keyUpListener);

        debouncedKeydownSubscription.unsubscribe();
      };
    }
  }, [onKeyDown, inputField, setInputFieldValue]);
  useEffect(() => {
    if (inputField) {
      const positionChange$ = new Subject();
      const positionChangeSubscription = positionChange$
        .pipe(debounceTime(100))
        .subscribe(() => setFieldRect(inputField.getBoundingClientRect()));

      const scrollListener = (e: Event) => {
        if ((e.target as HTMLElement).contains(inputField) || e.target === scrollListRef.current) {
          setFieldRect(undefined);
          positionChange$.next(null);
        }
      };
      const resizeListener = () => {
        setFieldRect(undefined);
        positionChange$.next(null);
      };

      document.addEventListener('scroll', scrollListener, { capture: true });
      window.addEventListener('resize', resizeListener);
      return () => {
        document.removeEventListener('scroll', scrollListener, { capture: true });
        window.removeEventListener('resize', resizeListener);
        positionChangeSubscription.unsubscribe();
      };
    }
    setFieldRect(undefined);
  }, [scrollListRef, inputField]);
  useEffect(() => {
    dispatch({ type: CLEAR_STATE });
    if (inputField) {
      setInputFieldValue(inputField.value);
    }
  }, [inputField, setInputFieldValue]);

  const { euiTheme } = useEuiTheme();
  if (!inputField || !fieldRect || displayedSuggestions.length === 0) return null;
  const { top, left, width, height } = fieldRect;
  return (
    <EuiPortal>
      <EuiPanel
        hasBorder
        paddingSize="none"
        css={css`
          position: absolute;
          top: ${top + height - 1}px;
          left: ${left}px;
          z-index: ${euiTheme.levels.modal};
          width: ${width}px;
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        `}
      >
        <div ref={innerRef}>
          <EuiListGroup
            flush
            size="s"
            gutterSize="none"
            css={css`
              max-height: 240px;
              overflow-y: auto;
              width: ${width}px;
              max-inline-size: unset;
            `}
          >
            {displayedSuggestions.map((suggestion, i) => (
              <EuiListGroupItem
                isActive={i === activeSuggestionIndex}
                data-suggestion-button
                key={`suggestion-${suggestion}-${i}`}
                label={
                  <EuiHighlight strict={false} search={inputField.value}>
                    {suggestion}
                  </EuiHighlight>
                }
                css={css`
                  border-bottom: ${euiTheme.border.thin};
                `}
                extraAction={
                  i === activeSuggestionIndex
                    ? { iconType: 'returnKey', alwaysShow: true }
                    : undefined
                }
                onClick={() => onChooseSuggestion(suggestion)}
              />
            ))}
          </EuiListGroup>
        </div>
      </EuiPanel>
    </EuiPortal>
  );
};
