/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PureComponent, ReactNode } from 'react';
import { isEmpty } from 'lodash';
import classNames from 'classnames';
import { css } from '@emotion/react';

import useRafState from 'react-use/lib/useRafState';
import { QuerySuggestion } from '../autocomplete';
import { SuggestionComponent } from './suggestion_component';
import {
  SUGGESTIONS_LIST_REQUIRED_BOTTOM_SPACE,
  SUGGESTIONS_LIST_REQUIRED_TOP_OFFSET,
  SUGGESTIONS_LIST_REQUIRED_WIDTH,
} from './constants';
import { SuggestionOnClick, SuggestionOnMouseEnter } from './types';
import { onRaf, shallowEqual } from '../utils';

interface SuggestionsComponentProps {
  index: number | null;
  onClick: SuggestionOnClick;
  onMouseEnter: SuggestionOnMouseEnter;
  show: boolean;
  suggestions: QuerySuggestion[];
  loadMore: () => void;
  size?: SuggestionsListSize;
  inputContainer: HTMLElement | null;
}

export interface SuggestionsAbstraction {
  type: 'alerts' | 'rules' | 'cases';
  fields: Record<
    string,
    {
      field: string;
      fieldToQuery: string;
      displayField: string | undefined;
      nestedDisplayField?: string;
      nestedField?: string;
      nestedPath?: string;
    }
  >;
}

export type SuggestionsListSize = 's' | 'l';

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default class SuggestionsComponent extends PureComponent<SuggestionsComponentProps> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;

  constructor(props: SuggestionsComponentProps) {
    super(props);

    this.assignParentNode = this.assignParentNode.bind(this);
    this.assignChildNode = this.assignChildNode.bind(this);
  }

  private assignParentNode(node: HTMLDivElement) {
    this.parentNode = node;
  }

  private assignChildNode(index: number, node: HTMLDivElement) {
    this.childNodes[index] = node;
  }

  public render() {
    if (!this.props.inputContainer || !this.props.show || isEmpty(this.props.suggestions)) {
      return null;
    }

    const renderSuggestions = (containerWidth: number) => {
      const isDescriptionFittable = containerWidth >= SUGGESTIONS_LIST_REQUIRED_WIDTH;
      const suggestions = this.props.suggestions.map((suggestion, index) => {
        return (
          <SuggestionComponent
            innerRef={this.assignChildNode}
            selected={index === this.props.index}
            index={index}
            suggestion={suggestion}
            onClick={this.props.onClick}
            onMouseEnter={this.props.onMouseEnter}
            ariaId={'suggestion-' + index}
            key={`${suggestion.type} - ${suggestion.text}`}
            shouldDisplayDescription={isDescriptionFittable}
          />
        );
      });

      return suggestions;
    };

    return (
      <ResizableSuggestionsListDiv
        inputContainer={this.props.inputContainer}
        suggestionsSize={this.props.size}
      >
        {(rect: DOMRect) => (
          <div
            id="kbnTypeahead__items"
            role="listbox"
            ref={this.assignParentNode}
            onScroll={this.handleScroll}
          >
            {renderSuggestions(rect.width)}
          </div>
        )}
      </ResizableSuggestionsListDiv>
    );
  }

  public componentDidUpdate(prevProps: SuggestionsComponentProps) {
    if (prevProps.index !== this.props.index) {
      this.scrollIntoView();
    }
  }

  private scrollIntoView = onRaf(() => {
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
  });

  private handleScroll = onRaf(() => {
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
  });
}

const ResizableSuggestionsListDiv: React.FC<{
  inputContainer: HTMLElement;
  suggestionsSize?: SuggestionsListSize;
  children: (rect: DOMRect) => ReactNode;
}> = React.memo((props) => {
  const inputContainer = props.inputContainer;

  const [{ documentHeight }, { pageYOffset }, containerRect] = useDimensions(inputContainer);

  if (!containerRect) return null;

  // reflects if the suggestions list has enough space below to be opened down
  const isSuggestionsListFittable =
    documentHeight - (containerRect.top + containerRect.height) >
    SUGGESTIONS_LIST_REQUIRED_BOTTOM_SPACE;
  const verticalListPosition = isSuggestionsListFittable
    ? `top: ${pageYOffset + containerRect.bottom - SUGGESTIONS_LIST_REQUIRED_TOP_OFFSET}px;`
    : `bottom: ${documentHeight - (pageYOffset + containerRect.top)}px;`;

  const divPosition = css`
    position: absolute;
    z-index: 4001;
    left: ${containerRect.left}px;
    width: ${containerRect.width}px;
    ${verticalListPosition}
  `;

  return (
    <div css={divPosition}>
      <div
        className={classNames('kbnTypeahead', {
          'kbnTypeahead--small': props.suggestionsSize === 's',
        })}
      >
        <div
          className={classNames('kbnTypeahead__popover', {
            ['kbnTypeahead__popover--bottom']: isSuggestionsListFittable,
            ['kbnTypeahead__popover--top']: !isSuggestionsListFittable,
          })}
        >
          {props.children(containerRect)}
        </div>
      </div>
    </div>
  );
});

function useDimensions(
  container: HTMLElement | null
): [{ documentHeight: number }, { pageYOffset: number; pageXOffset: number }, DOMRect | null] {
  const [documentHeight, setDocumentHeight] = useRafState(
    () => document.documentElement.clientHeight || window.innerHeight
  );

  const [pageOffset, setPageOffset] = useRafState<{ pageXOffset: number; pageYOffset: number }>(
    () => ({
      pageXOffset: window.pageXOffset,
      pageYOffset: window.pageYOffset,
    })
  );

  const [containerRect, setContainerRect] = useRafState<DOMRect | null>(() => {
    return container?.getBoundingClientRect() ?? null;
  });

  const updateContainerRect = React.useCallback(() => {
    setContainerRect((oldRect: DOMRect | null) => {
      const newRect = container?.getBoundingClientRect() ?? null;
      const rectsEqual = shallowEqual(oldRect?.toJSON(), newRect?.toJSON());
      return rectsEqual ? oldRect : newRect;
    });
  }, [container, setContainerRect]);

  React.useEffect(() => {
    const handler = () => {
      setDocumentHeight(document.documentElement.clientHeight || window.innerHeight);
    };

    window.addEventListener('resize', handler, { passive: true });

    return () => {
      window.removeEventListener('resize', handler);
    };
  }, [setDocumentHeight]);

  React.useEffect(() => {
    const handler = () => {
      setPageOffset((state) => {
        const { pageXOffset, pageYOffset } = window;
        return state.pageXOffset !== pageXOffset || state.pageYOffset !== pageYOffset
          ? {
              pageXOffset,
              pageYOffset,
            }
          : state;
      });

      updateContainerRect();
    };

    window.addEventListener('scroll', handler, { passive: true, capture: true });

    const resizeObserver =
      typeof window.ResizeObserver !== 'undefined' &&
      new ResizeObserver(() => {
        updateContainerRect();
      });
    if (container && resizeObserver) {
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('scroll', handler, { capture: true });
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [setPageOffset, container, updateContainerRect]);

  return [{ documentHeight }, pageOffset, containerRect];
}
