/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import React, { Component } from 'react';
import { AutocompleteSuggestion } from '../query_bar';
import { SuggestionComponent } from './suggestion_component';

interface Props {
  index: number | null;
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: (index: number) => void;
  show: boolean;
  suggestions: AutocompleteSuggestion[];
  loadMore: () => void;
}

export class SuggestionsComponent extends Component<Props> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;

  public render() {
    if (!this.props.show || isEmpty(this.props.suggestions)) {
      return null;
    }

    const suggestions = this.props.suggestions.map((suggestion, index) => {
      const innerRef = (node: any) => (this.childNodes[index] = node);
      const mouseEnter = () => this.props.onMouseEnter(index);
      return (
        <SuggestionComponent
          innerRef={innerRef}
          selected={index === this.props.index}
          suggestion={suggestion}
          onClick={this.props.onClick}
          onMouseEnter={mouseEnter}
          ariaId={'suggestion-' + index}
          key={`${suggestion.type} - ${index} - ${suggestion.text}`}
        />
      );
    });

    return (
      <div className="reactSuggestionTypeahead">
        <div className="typeahead">
          <div className="typeahead-popover">
            <div
              id="typeahead-items"
              className="typeahead-items"
              role="listbox"
              ref={node => (this.parentNode = node)}
              onScroll={this.handleScroll}
            >
              {suggestions}
            </div>
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
