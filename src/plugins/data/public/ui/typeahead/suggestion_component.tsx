/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import React, { FunctionComponent } from 'react';
import { AutocompleteSuggestion } from '../..';

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
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: AutocompleteSuggestion;
  innerRef: (node: HTMLDivElement) => void;
  ariaId: string;
}

export const SuggestionComponent: FunctionComponent<Props> = props => {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      className={classNames({
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
        <div className="kbnSuggestionItem__text">{props.suggestion.text}</div>
        <div className="kbnSuggestionItem__description">{props.suggestion.description}</div>
      </div>
    </div>
  );
};
