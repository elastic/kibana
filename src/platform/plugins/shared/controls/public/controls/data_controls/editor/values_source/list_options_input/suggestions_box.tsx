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
import { PublishingSubject, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React, { Reducer, useCallback, useEffect, useReducer, useRef } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { BehaviorSubject, debounceTime } from 'rxjs';

/**
 * EuiInputPopover is not compatible with react-window virtualized items, so use this custom
 * component to render the suggestions box on the focused field
 */
interface Props {
  innerRef: React.RefObject<HTMLDivElement>;
  inputField$: PublishingSubject<HTMLInputElement | null>;
  suggestions: string[];
  onChoose: (s: string) => void;
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

export const SuggestionsBox = ({ suggestions, onChoose, innerRef, inputField$ }: Props) => {
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
            displayedSuggestions: suggestions,
            inputFieldValue: '',
            activeSuggestionIndex: null,
          };
      }
    },
    {
      activeSuggestionIndex: null,
      inputFieldValue: inputField$.getValue()?.value ?? '',
      displayedSuggestions: filterSuggestionsByInputFieldValue(
        suggestions,
        inputField$.getValue()?.value ?? ''
      ),
    }
  );

  // Make the current keyboard-active suggestion available to the keyboard listener functions
  // which don't reinitialize on state change
  const activeSuggestionValue = useRef<string | null>(null);
  useEffect(() => {
    if (activeSuggestionIndex === null) activeSuggestionValue.current = null;
    else activeSuggestionValue.current = displayedSuggestions[activeSuggestionIndex];
  }, [activeSuggestionIndex, displayedSuggestions]);

  const setInputFieldValue = useCallback(
    (value: string) => dispatch({ type: SET_INPUT_FIELD_VALUE, value }),
    [dispatch]
  );
  const onChooseSuggestion = useCallback(
    (suggestion: string) => {
      if (!inputField.current) return;
      inputField.current.value = suggestion;
      inputField.current.focus();
      onChoose(suggestion);
      dispatch({ type: SET_INPUT_FIELD_VALUE, value: suggestion });
    },
    [onChoose]
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
      } else if (e.key === 'Enter' && activeSuggestionValue.current) {
        e.preventDefault();
        onChooseSuggestion(activeSuggestionValue.current);
      }
    },
    [onChooseSuggestion]
  );

  // Track the input field in a subscription for rendering
  const publishedField = useStateFromPublishingSubject(inputField$);
  // Track the input field in a ref to handle binding and unbinding keyboard handlers when it changes
  const inputField = useRef<HTMLInputElement | null>(publishedField);
  const keyDownListener = useRef(onKeyDown);

  useEffect(() => {
    // When keydown listener changes, unbind the previous and rebind the new one
    const nextKeyDownListener = onKeyDown;
    if (inputField.current) {
      inputField.current.removeEventListener('keydown', keyDownListener.current);
      inputField.current.addEventListener('keydown', nextKeyDownListener);
    }
    keyDownListener.current = onKeyDown;
  }, [onKeyDown]);

  useEffectOnce(() => {
    const keyUp$ = new BehaviorSubject<Event | null>(null);
    const keyUpListener = (e: Event) => {
      keyUp$.next(e);
    };

    const keyUpSubscription = keyUp$.pipe(debounceTime(10)).subscribe((e) => {
      if (!e || !inputField.current) return;
      setInputFieldValue(inputField.current.value);
    });

    const inputFieldSubscription = inputField$.pipe(debounceTime(0)).subscribe((field) => {
      if (inputField.current) {
        inputField.current.removeEventListener('keydown', keyDownListener.current);
        inputField.current.removeEventListener('keyup', keyUpListener);
      }
      dispatch({ type: CLEAR_STATE });
      inputField.current = field;
      if (field) {
        field.addEventListener('keydown', keyDownListener.current);
        field.addEventListener('keyup', keyUpListener);
        setInputFieldValue(field.value);
      }
    });
    return () => {
      inputField.current?.removeEventListener('keydown', keyDownListener.current);
      inputField.current?.removeEventListener('keyup', keyUpListener);
      inputFieldSubscription.unsubscribe();
      keyUpSubscription.unsubscribe();
    };
  });

  const { euiTheme } = useEuiTheme();
  if (!publishedField || inputField.current !== publishedField) return null;
  const { top, left, width, height } = publishedField.getBoundingClientRect();
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
                  <EuiHighlight strict={false} search={publishedField.value}>
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
