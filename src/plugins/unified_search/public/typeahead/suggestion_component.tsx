/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import React, { useCallback } from 'react';
import { QuerySuggestion } from '@kbn/data-plugin/public';
import { SuggestionOnClick, SuggestionOnMouseEnter } from './types';

function getEuiIconType(type: string) {
  switch (type) {
    case 'field':
      return 'kqlField';
    case 'value':
      return 'kqlValue';
    case 'recentSearch':
      return 'search';
    case 'conjunction':
      return 'kqlSelector';
    case 'operator':
      return 'kqlOperand';
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

interface Props {
  onClick: SuggestionOnClick;
  onMouseEnter: SuggestionOnMouseEnter;
  selected: boolean;
  index: number;
  suggestion: QuerySuggestion;
  innerRef: (index: number, node: HTMLDivElement) => void;
  ariaId: string;
  shouldDisplayDescription: boolean;
}

export const SuggestionComponent = React.memo(function SuggestionComponent(props: Props) {
  const { index, innerRef, onClick, onMouseEnter, suggestion } = props;
  const setRef = useCallback(
    (node: HTMLDivElement) => {
      innerRef(index, node);
    },
    [index, innerRef]
  );

  const handleClick = useCallback(() => {
    onClick(suggestion, index);
  }, [index, onClick, suggestion]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(suggestion, index);
  }, [index, onMouseEnter, suggestion]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      className={classNames({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        kbnTypeahead__item: true,
        active: props.selected,
      })}
      role="option"
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      ref={setRef}
      id={props.ariaId}
      aria-selected={props.selected}
      data-test-subj={`autocompleteSuggestion-${
        props.suggestion.type
      }-${props.suggestion.text.replace(/\s/g, '-')}`}
    >
      <div
        className={classNames({
          kbnSuggestionItem: true,
          ['kbnSuggestionItem--' + props.suggestion.type]: true,
        })}
      >
        <div className="kbnSuggestionItem__type">
          <EuiIcon type={getEuiIconType(props.suggestion.type)} />
        </div>
        <div className="kbnSuggestionItem__text" data-test-subj="autoCompleteSuggestionText">
          {props.suggestion.text}
        </div>
        {props.shouldDisplayDescription && (
          <div
            className="kbnSuggestionItem__description"
            data-test-subj="autoCompleteSuggestionDescription"
          >
            {props.suggestion.description}
          </div>
        )}
      </div>
    </div>
  );
});
