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

import { isEmpty } from 'lodash';
import React, { Component } from 'react';
import classNames from 'classnames';
import styled from 'styled-components';
import { QuerySuggestion } from '../../autocomplete';
import { SuggestionComponent } from './suggestion_component';

interface Props {
  index: number | null;
  onClick: (suggestion: QuerySuggestion) => void;
  onMouseEnter: (index: number) => void;
  show: boolean;
  suggestions: QuerySuggestion[];
  loadMore: () => void;
  queryBarRect?: DOMRect;
  className?: string;
}

export class SuggestionsComponent extends Component<Props> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;
  private suggestionsListRequiredWidth = 600;

  public render() {
    if (!this.props.show || isEmpty(this.props.suggestions)) {
      return null;
    }

    const suggestions = this.props.suggestions.map((suggestion, index) => {
      const isDescriptionFittable = Boolean(
        this.props.queryBarRect &&
          this.props.queryBarRect.width >= this.suggestionsListRequiredWidth
      );
      return (
        <SuggestionComponent
          innerRef={(node) => (this.childNodes[index] = node)}
          selected={index === this.props.index}
          suggestion={suggestion}
          onClick={this.props.onClick}
          onMouseEnter={() => this.props.onMouseEnter(index)}
          ariaId={'suggestion-' + index}
          key={`${suggestion.type} - ${suggestion.text}`}
          shouldDisplayDescription={isDescriptionFittable}
        />
      );
    });

    return (
      <div className={classNames('kbnTypeahead', this.props.className)}>
        <div className="kbnTypeahead__popover">
          <div
            id="kbnTypeahead__items"
            role="listbox"
            ref={(node) => (this.parentNode = node)}
            onScroll={this.handleScroll}
          >
            {suggestions}
          </div>
        </div>
      </div>
    );
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.index !== this.props.index) {
      this.scrollIntoView();
    }
  }

  private scrollIntoView = () => {
    if (this.props.index === null) {
      return;
    }
    const parent = this.parentNode;
    const child = this.childNodes[this.props.index];

    if (this.props.index == null || !parent || !child) {
      return;
    }

    const scrollTop = Math.max(
      Math.min(parent.scrollTop, child.offsetTop),
      child.offsetTop + child.offsetHeight - parent.offsetHeight
    );

    parent.scrollTop = scrollTop;
  };

  private handleScroll = () => {
    if (!this.props.loadMore || !this.parentNode) {
      return;
    }

    const position = this.parentNode.scrollTop + this.parentNode.offsetHeight;
    const height = this.parentNode.scrollHeight;
    const remaining = height - position;
    const margin = 50;

    if (!height || !position) {
      return;
    }
    if (remaining <= margin) {
      this.props.loadMore();
    }
  };
}

export const StyledSuggestionsComponent = styled(SuggestionsComponent)`
  ${(props) => {
    const { queryBarRect } = props;

    return queryBarRect
      ? `left: ${queryBarRect.left}px;
      width: ${queryBarRect.width}px;
      top: ${window.scrollY + queryBarRect.bottom}px;`
      : '';
  }}
`;
