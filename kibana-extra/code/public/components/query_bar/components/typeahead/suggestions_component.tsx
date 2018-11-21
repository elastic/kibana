/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToken } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { Component } from 'react';

import {
  AutocompleteSuggestion,
  AutocompleteSuggestionGroup,
  AutocompleteSuggestionType,
} from '../..';
import { SuggestionComponent } from './suggestion_component';

interface Props {
  groupIndex: number | null;
  itemIndex: number | null;
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: (groupIndex: number, itemIndex: number) => void;
  show: boolean;
  suggestionGroups: AutocompleteSuggestionGroup[];
  loadMore: () => void;
}

export class SuggestionsComponent extends Component<Props> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;

  public render() {
    if (!this.props.show || isEmpty(this.props.suggestionGroups)) {
      return null;
    }
    const suggestionGroups = this.props.suggestionGroups
      .filter((group: AutocompleteSuggestionGroup) => group.suggestions.length > 0)
      .map((group: AutocompleteSuggestionGroup, groupIndex: number) => {
        const { suggestions, total, type } = group;
        const suggestionComps = suggestions.map(
          (suggestion: AutocompleteSuggestion, itemIndex: number) => {
            const innerRef = (node: any) => (this.childNodes[itemIndex] = node);
            const mouseEnter = () => this.props.onMouseEnter(groupIndex, itemIndex);
            const isSelected =
              groupIndex === this.props.groupIndex && itemIndex === this.props.itemIndex;
            return (
              <SuggestionComponent
                innerRef={innerRef}
                selected={isSelected}
                suggestion={suggestion}
                onClick={this.props.onClick}
                onMouseEnter={mouseEnter}
                ariaId={`suggestion-${groupIndex}-${itemIndex}`}
                key={`${suggestion.tokenType} - ${groupIndex}-${itemIndex} - ${suggestion.text}`}
              />
            );
          }
        );

        const groupHeader = (
          <div>
            <span>
              <EuiToken iconType={this.getGroupTokenType(group.type)} />
              <strong>{this.getGroupTitle(group.type)}</strong>
            </span>
            <span> {group.total} results </span>
          </div>
        );

        return (
          <div
            id="typeahead-items"
            className="typeahead-items"
            role="listbox"
            ref={node => (this.parentNode = node)}
            onScroll={this.handleScroll}
            key={`${type}-suggestions`}
          >
            {groupHeader}
            {suggestionComps}
          </div>
        );
      });

    return (
      <div className="reactSuggestionTypeahead">
        <div className="typeahead">
          <div className="typeahead-popover">{suggestionGroups}</div>
        </div>
      </div>
    );
  }

  public componentDidUpdate(prevProps: Props) {
    if (
      prevProps.groupIndex !== this.props.groupIndex ||
      prevProps.itemIndex !== this.props.itemIndex
    ) {
      this.scrollIntoView();
    }
  }

  private getGroupTokenType(type: AutocompleteSuggestionType): string {
    switch (type) {
      case AutocompleteSuggestionType.FILE:
        return 'tokenFile';
      case AutocompleteSuggestionType.REPOSITORY:
        return 'tokenRepo';
      case AutocompleteSuggestionType.SYMBOL:
        return 'tokenSymbol';
    }
  }

  private getGroupTitle(type: AutocompleteSuggestionType): string {
    switch (type) {
      case AutocompleteSuggestionType.FILE:
        return 'Files';
      case AutocompleteSuggestionType.REPOSITORY:
        return 'Repos';
      case AutocompleteSuggestionType.SYMBOL:
        return 'Symbols';
    }
  }

  private scrollIntoView = () => {
    if (this.props.groupIndex === null || this.props.itemIndex === null) {
      return;
    }
    const parent = this.parentNode;
    const child = this.childNodes[this.props.itemIndex];

    if (this.props.groupIndex == null || this.props.itemIndex === null || !parent || !child) {
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
