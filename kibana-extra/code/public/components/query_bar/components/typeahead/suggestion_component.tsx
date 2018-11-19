/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import React, { SFC } from 'react';

import { AutocompleteSuggestion } from '../query_bar';

function getEuiIconType(type: string) {
  return 'kqlField';
  // switch (type) {
  //   case 'field':
  //     return 'kqlField';
  //   case 'value':
  //     return 'kqlValue';
  //   case 'recentSearch':
  //     return 'search';
  //   case 'conjunction':
  //     return 'kqlSelector';
  //   case 'operator':
  //     return 'kqlOperand';
  //   default:
  //     throw new Error(`Unknown type: ${type}`);
  // }
}

interface Props {
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: AutocompleteSuggestion;
  innerRef: (node: HTMLDivElement) => void;
  ariaId: string;
}

export const SuggestionComponent: SFC<Props> = props => {
  const cls = classNames({
    'typeahead-item': true,
    active: props.selected,
  });
  const click = () => props.onClick(props.suggestion);
  return (
    <div
      className={cls}
      role="option"
      onClick={click}
      onMouseEnter={props.onMouseEnter}
      ref={props.innerRef}
      id={props.ariaId}
    >
      <div className={'suggestionItem suggestionItem--' + props.suggestion.type}>
        <div className="suggestionItem__type">
          <EuiIcon type={getEuiIconType(props.suggestion.type)} />
        </div>
        <div className="suggestionItem__text">{props.suggestion.text}</div>
        <div
          className="suggestionItem__description"
          // Description currently always comes from us and we escape any potential user input
          // at the time we're generating the description text
          // eslint-disable-next-line react/no-danger
          // @ts-ignore
          dangerouslySetInnerHTML={{ __html: props.suggestion.description }}
        />
      </div>
    </div>
  );
};
