/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import React, { Component } from 'react';
import classNames from 'classnames';
import styled from 'styled-components';
import { QuerySuggestion } from '../../autocomplete';
import { SuggestionComponent } from './suggestion_component';
import {
  SUGGESTIONS_LIST_REQUIRED_BOTTOM_SPACE,
  SUGGESTIONS_LIST_REQUIRED_TOP_OFFSET,
  SUGGESTIONS_LIST_REQUIRED_WIDTH,
} from './constants';

// @internal
export interface SuggestionsComponentProps {
  index: number | null;
  onClick: (suggestion: QuerySuggestion) => void;
  onMouseEnter: (index: number) => void;
  show: boolean;
  suggestions: QuerySuggestion[];
  loadMore: () => void;
  queryBarRect?: DOMRect;
  size?: SuggestionsListSize;
}

export type SuggestionsListSize = 's' | 'l';

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default class SuggestionsComponent extends Component<SuggestionsComponentProps> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;

  public render() {
    if (!this.props.queryBarRect || !this.props.show || isEmpty(this.props.suggestions)) {
      return null;
    }

    const suggestions = this.props.suggestions.map((suggestion, index) => {
      const isDescriptionFittable =
        this.props.queryBarRect!.width >= SUGGESTIONS_LIST_REQUIRED_WIDTH;
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

    const documentHeight = document.documentElement.clientHeight || window.innerHeight;
    const { queryBarRect } = this.props;

    // reflects if the suggestions list has enough space below to be opened down
    const isSuggestionsListFittable =
      documentHeight - (queryBarRect.top + queryBarRect.height) >
      SUGGESTIONS_LIST_REQUIRED_BOTTOM_SPACE;
    const verticalListPosition = isSuggestionsListFittable
      ? `top: ${window.scrollY + queryBarRect.bottom - SUGGESTIONS_LIST_REQUIRED_TOP_OFFSET}px;`
      : `bottom: ${documentHeight - (window.scrollY + queryBarRect.top)}px;`;

    return (
      <StyledSuggestionsListDiv
        queryBarRect={queryBarRect}
        verticalListPosition={verticalListPosition}
      >
        <div
          className={classNames('kbnTypeahead', { 'kbnTypeahead--small': this.props.size === 's' })}
        >
          <div
            className={classNames('kbnTypeahead__popover', {
              ['kbnTypeahead__popover--bottom']: isSuggestionsListFittable,
              ['kbnTypeahead__popover--top']: !isSuggestionsListFittable,
            })}
          >
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
      </StyledSuggestionsListDiv>
    );
  }

  public componentDidUpdate(prevProps: SuggestionsComponentProps) {
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

const StyledSuggestionsListDiv = styled.div`
  ${(props: { queryBarRect: DOMRect; verticalListPosition: string }) => `
      position: absolute;
      z-index: 4001;
      left: ${props.queryBarRect.left}px;
      width: ${props.queryBarRect.width}px;
      ${props.verticalListPosition}`}
`;
