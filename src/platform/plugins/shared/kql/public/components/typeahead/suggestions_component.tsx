/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { PureComponent } from 'react';
import { isEmpty } from 'lodash';
import classNames from 'classnames';

import useRafState from 'react-use/lib/useRafState';
import type { IconType, UseEuiTheme } from '@elastic/eui';
import { EuiIcon, euiFontSize, euiShadow, euiShadowFlat, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { type EmotionStyles, useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { QuerySuggestion } from '../../autocomplete';
import { SuggestionComponent } from './suggestion_component';
import {
  SUGGESTIONS_LIST_REQUIRED_BOTTOM_SPACE,
  SUGGESTIONS_LIST_REQUIRED_TOP_OFFSET,
  SUGGESTIONS_LIST_REQUIRED_WIDTH,
} from './constants';
import type { SuggestionOnClick, SuggestionOnMouseEnter } from './types';
import { onRaf, shallowEqual } from '../utils';

export interface SuggestionFooterOption {
  label: string;
  iconType?: IconType;
  onClick: () => void;
}

interface SuggestionsComponentProps {
  index: number | null;
  onClick: SuggestionOnClick;
  onMouseEnter: SuggestionOnMouseEnter;
  show: boolean;
  suggestions: QuerySuggestion[];
  loadMore: () => void;
  size?: SuggestionsListSize;
  inputContainer: HTMLElement | null;
  footerOption?: SuggestionFooterOption;
}

export interface SuggestionsAbstraction {
  type: 'alerts' | 'rules' | 'cases' | 'endpoints' | 'action_policies';
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

export class SuggestionsComponent extends PureComponent<SuggestionsComponentProps> {
  private childNodes: HTMLDivElement[] = [];
  private parentNode: HTMLDivElement | null = null;
  private footerNode: HTMLDivElement | null = null;

  constructor(props: SuggestionsComponentProps) {
    super(props);

    this.assignParentNode = this.assignParentNode.bind(this);
    this.assignChildNode = this.assignChildNode.bind(this);
    this.assignFooterNode = this.assignFooterNode.bind(this);
  }

  private assignParentNode(node: HTMLDivElement) {
    this.parentNode = node;
  }

  private assignChildNode(index: number, node: HTMLDivElement) {
    this.childNodes[index] = node;
  }

  private assignFooterNode(node: HTMLDivElement | null) {
    this.footerNode = node;
  }

  public render() {
    const hasContent = !isEmpty(this.props.suggestions) || Boolean(this.props.footerOption);
    if (!this.props.inputContainer || !this.props.show || !hasContent) {
      return null;
    }

    const renderSuggestions = (containerWidth: number) => {
      const isDescriptionFittable = containerWidth >= SUGGESTIONS_LIST_REQUIRED_WIDTH;
      return this.props.suggestions.map((suggestion, index) => (
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
      ));
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
            {this.props.footerOption && (
              <SuggestionFooterItem
                option={this.props.footerOption}
                selected={this.props.index === this.props.suggestions.length}
                innerRef={this.assignFooterNode}
              />
            )}
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
    const isFooterSelected =
      this.props.index === this.props.suggestions.length && Boolean(this.props.footerOption);
    const child = isFooterSelected ? this.footerNode : this.childNodes[this.props.index];

    if (!parent || !child) {
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

function SuggestionFooterItem({
  option,
  selected,
  innerRef,
}: {
  option: SuggestionFooterOption;
  selected?: boolean;
  innerRef?: (node: HTMLDivElement | null) => void;
}) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const fontSize = euiFontSize(euiThemeContext, 'xs').fontSize;

  return (
    <div
      ref={innerRef}
      role="option"
      tabIndex={-1}
      aria-selected={selected ?? false}
      data-test-subj="kbnSuggestionFooterOption"
      css={css({
        display: 'flex',
        alignItems: 'stretch',
        cursor: 'pointer',
        minHeight: euiTheme.size.xl,
        fontSize,
        borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        '& > div:last-child': {
          backgroundColor: selected ? euiTheme.colors.backgroundBaseSubdued : undefined,
        },
        '&:hover > div:last-child': {
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        },
      })}
      onMouseDown={(e) => {
        e.preventDefault();
        option.onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          option.onClick();
        }
      }}
    >
      {option.iconType && (
        <div
          css={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: euiTheme.size.xl,
            flexShrink: 0,
            backgroundColor: euiTheme.colors.backgroundFilledAssistance,
          })}
        >
          <EuiIcon type={option.iconType} size="s" color="white" />
        </div>
      )}
      <div
        css={css({
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${euiTheme.size.s}`,
          color: euiTheme.colors.textSubdued,
          backgroundColor: euiTheme.colors.backgroundBaseAssistance,
          fontSize,
        })}
      >
        {option.label}
      </div>
    </div>
  );
}

const ResizableSuggestionsListDiv: React.FC<{
  inputContainer: HTMLElement;
  suggestionsSize?: SuggestionsListSize;
  children: (rect: DOMRect) => ReactNode;
}> = React.memo((props) => {
  const inputContainer = props.inputContainer;

  const [{ documentHeight }, { pageYOffset }, containerRect] = useDimensions(inputContainer);
  const styles = useMemoCss(suggestionsStyles);

  if (!containerRect) return null;

  // reflects if the suggestions list has enough space below to be opened down
  const isSuggestionsListFittable =
    documentHeight - (containerRect.top + containerRect.height) >
    SUGGESTIONS_LIST_REQUIRED_BOTTOM_SPACE;
  const verticalListPosition = isSuggestionsListFittable
    ? { top: `${pageYOffset + containerRect.bottom - SUGGESTIONS_LIST_REQUIRED_TOP_OFFSET}px` }
    : { bottom: `${documentHeight - (pageYOffset + containerRect.top)}px` };

  return (
    <div
      css={styles.container}
      style={{
        left: `${containerRect.left}px`,
        width: `${containerRect.width}px`,
        ...verticalListPosition,
      }}
    >
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
          <div className={classNames('kbnTypeahead__popover-content', 'eui-scrollBar')}>
            {props.children(containerRect)}
          </div>
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

const suggestionsStyles: EmotionStyles = {
  container: (context: UseEuiTheme) =>
    css({
      position: 'absolute',
      zIndex: 4001,
      '.kbnTypeahead': {
        maxHeight: '60vh',
        '&.kbnTypeahead--small': {
          maxHeight: '20vh',
        },
      },
      '.kbnTypeahead__popover': {
        maxHeight: 'inherit',
        border: `1px solid ${context.euiTheme.colors.borderBaseSubdued}`,
        color: context.euiTheme.colors.text,
        backgroundColor: context.euiTheme.colors.emptyShade,
        position: 'relative',
        zIndex: context.euiTheme.levels.menu,
        width: '100%',
        overflow: 'hidden',

        '.kbnTypeahead__popover-content': {
          maxHeight: 'inherit',
          overflowY: 'auto',
        },

        '&.kbnTypeahead__popover--top': css([
          euiShadowFlat(context, { border: 'none' }),
          {
            borderTopLeftRadius: context.euiTheme.border.radius.medium,
            borderTopRightRadius: context.euiTheme.border.radius.medium,
            // Clips the shadow so it doesn't show above the input (below)
            clipPath: `polygon(-50px -50px, calc(100% + 50px) -50px, calc(100% + 50px) 100%, -50px 100%)`,
          },
        ]),
        '&.kbnTypeahead__popover--bottom': css([
          euiShadow(context, 'l', { border: 'none' }),
          {
            borderBottomLeftRadius: context.euiTheme.border.radius.medium,
            borderBottomRightRadius: context.euiTheme.border.radius.medium,
            // Clips the shadow so it doesn't show above the input (top)
            clipPath: `polygon(-50px 1px, calc(100% + 50px) 1px, calc(100% + 50px) calc(100% + 50px), -50px calc(100% + 50px))`,
          },
        ]),
      },
    }),
};
