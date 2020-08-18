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
import React, { Component, createRef, RefObject } from 'react';
import { QuerySuggestion } from '../../autocomplete';
import { SuggestionComponent } from './suggestion_component';
import {
  suggestionsListDefaultMaxHeight,
  suggestionsListOffsetBottom,
  suggestionsListRequiredWidth,
} from './constants';

interface Props {
  index: number | null;
  onClick: (suggestion: QuerySuggestion) => void;
  onMouseEnter: (index: number) => void;
  show: boolean;
  suggestions: QuerySuggestion[];
  loadMore: () => void;
  queryBarInputDivRef: RefObject<HTMLDivElement>;
  dropdownHeight?: string;
}

export class SuggestionsComponent extends Component<Props> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;

  kbnTypeaheadDivRefInstance: RefObject<HTMLDivElement> = createRef();

  updatePosition = () => {
    const kbnTypeaheadDiv = this.kbnTypeaheadDivRefInstance.current;
    const queryBarRect = this.props.queryBarInputDivRef.current?.getBoundingClientRect();

    if (queryBarRect && kbnTypeaheadDiv) {
      const documentHeight = document.documentElement.clientHeight || window.innerHeight;
      const suggestionsListHeight = kbnTypeaheadDiv.clientHeight;

      // reflects if the suggestions list has enough space below to be opened down
      const isSuggestionsListFittable =
        documentHeight -
          (suggestionsListHeight +
            queryBarRect.top +
            queryBarRect.height +
            suggestionsListOffsetBottom) >
        0;

      kbnTypeaheadDiv.style.position = 'absolute';
      kbnTypeaheadDiv.style.left = `${queryBarRect.left}px`;
      kbnTypeaheadDiv.style.width = `${queryBarRect.width}px`;
      kbnTypeaheadDiv.style.top = isSuggestionsListFittable
        ? `${window.scrollY + queryBarRect.top + queryBarRect.height}px`
        : `${window.scrollY + queryBarRect.top - suggestionsListHeight}px`;
      kbnTypeaheadDiv.style.maxHeight =
        this.props.dropdownHeight || suggestionsListDefaultMaxHeight;
      kbnTypeaheadDiv.style.opacity = '1';
    }
  };

  public render() {
    if (!this.props.show || isEmpty(this.props.suggestions)) {
      return null;
    }

    const suggestions = this.props.suggestions.map((suggestion, index) => {
      const queryBarInputDiv = this.props.queryBarInputDivRef.current;
      const isDescriptionFittable = Boolean(
        queryBarInputDiv &&
          queryBarInputDiv.getBoundingClientRect().width >= suggestionsListRequiredWidth
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
      <div className="reactSuggestionTypeahead">
        <div className="kbnTypeahead" ref={this.kbnTypeaheadDivRefInstance}>
          <div className="kbnTypeahead__popover">
            <div
              id="kbnTypeahead__items"
              className="kbnTypeahead__items"
              role="listbox"
              ref={(node) => (this.parentNode = node)}
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
    this.updatePosition();

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

  closeListOnScroll = (event: Event) => {
    // Close the list when a scroll event happens, but not if the scroll happened in the suggestions list.
    // This mirrors Firefox's approach of auto-closing `select` elements onscroll.
    if (
      this.kbnTypeaheadDivRefInstance.current &&
      event.target &&
      this.kbnTypeaheadDivRefInstance.current.contains(event.target as Node) === false
    ) {
      this.updatePosition();
    }
  };

  componentDidMount() {
    this.updatePosition();
    window.addEventListener('resize', this.updatePosition);

    setTimeout(() => {
      window.addEventListener('scroll', this.closeListOnScroll, {
        passive: true, // for better performance as we won't call preventDefault
        capture: true, // scroll events don't bubble, they must be captured instead
      });
    }, 500);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updatePosition);
    window.removeEventListener('scroll', this.closeListOnScroll, {
      capture: true,
    });
  }
}
