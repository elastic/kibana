/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToken } from '@elastic/eui';
import classNames from 'classnames';
import React, { SFC } from 'react';

import { AutocompleteSuggestion } from '../..';

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
      <div className={'suggestionItem suggestionItem--' + props.suggestion.tokenType}>
        &nbsp;&nbsp;&nbsp;&nbsp;
        <div className="suggestionItem__type">
          <EuiToken iconType={props.suggestion.tokenType} />
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
