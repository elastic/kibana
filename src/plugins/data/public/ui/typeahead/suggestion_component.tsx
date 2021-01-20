/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { QuerySuggestion } from '../../autocomplete';

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
  onClick: (suggestion: QuerySuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: QuerySuggestion;
  innerRef: (node: HTMLDivElement) => void;
  ariaId: string;
  shouldDisplayDescription: boolean;
}

export function SuggestionComponent(props: Props) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      className={classNames({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        kbnTypeahead__item: true,
        active: props.selected,
      })}
      role="option"
      onClick={() => props.onClick(props.suggestion)}
      onMouseEnter={props.onMouseEnter}
      ref={props.innerRef}
      id={props.ariaId}
      aria-selected={props.selected}
      data-test-subj={`autocompleteSuggestion-${
        props.suggestion.type
      }-${props.suggestion.text.replace(/\s/g, '-')}`}
    >
      <div className={'kbnSuggestionItem kbnSuggestionItem--' + props.suggestion.type}>
        <div className="kbnSuggestionItem__type">
          <EuiIcon type={getEuiIconType(props.suggestion.type)} />
        </div>
        <div className="kbnSuggestionItem__text" data-test-subj="autoCompleteSuggestionText">
          {props.suggestion.text}
        </div>
        {props.shouldDisplayDescription && (
          <div className="kbnSuggestionItem__description">{props.suggestion.description}</div>
        )}
      </div>
    </div>
  );
}
