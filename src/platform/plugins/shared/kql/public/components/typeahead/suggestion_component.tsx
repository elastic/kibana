/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, euiFontSize } from '@elastic/eui';
import classNames from 'classnames';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { type EmotionStyles, useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { QuerySuggestion } from '../../autocomplete';
import type { SuggestionOnClick, SuggestionOnMouseEnter } from './types';

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
  onClick: SuggestionOnClick;
  onMouseEnter: SuggestionOnMouseEnter;
  selected: boolean;
  index: number;
  suggestion: QuerySuggestion;
  innerRef: (index: number, node: HTMLDivElement) => void;
  ariaId: string;
  shouldDisplayDescription: boolean;
}

export const SuggestionComponent = React.memo(function SuggestionComponent(props: Props) {
  const { index, innerRef, onClick, onMouseEnter, suggestion } = props;
  const setRef = useCallback(
    (node: HTMLDivElement) => {
      innerRef(index, node);
    },
    [index, innerRef]
  );

  const handleClick = useCallback(() => {
    onClick(suggestion, index);
  }, [index, onClick, suggestion]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(suggestion, index);
  }, [index, onMouseEnter, suggestion]);

  const styles = useMemoCss(suggestionStyles);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      className={classNames('kbnTypeahead__item', {
        active: props.selected,
      })}
      css={styles.suggestionItem}
      role="option"
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      ref={setRef}
      id={props.ariaId}
      aria-selected={props.selected}
      data-test-subj={`autocompleteSuggestion-${
        props.suggestion.type
      }-${props.suggestion.text.replace(/\s/g, '-')}`}
    >
      <div
        className={classNames({
          kbnSuggestionItem: true,
          ['kbnSuggestionItem--' + props.suggestion.type]: true,
        })}
      >
        <div className="kbnSuggestionItem__type">
          <EuiIcon type={getEuiIconType(props.suggestion.type)} />
        </div>
        <div className="kbnSuggestionItem__text" data-test-subj="autoCompleteSuggestionText">
          {props.suggestion.text}
        </div>
        {props.shouldDisplayDescription && (
          <div
            className="kbnSuggestionItem__description"
            data-test-subj="autoCompleteSuggestionDescription"
          >
            {props.suggestion.description}
          </div>
        )}
      </div>
    </div>
  );
});

// These are the various types in the dropdown, they each get a color
const kbnTypeaheadTypes = {
  field: {
    base: 'backgroundBaseWarning' as const,
    active: 'backgroundLightWarning' as const,
    text: 'textWarning' as const,
  },
  value: {
    base: 'backgroundBaseSuccess' as const,
    active: 'backgroundLightSuccess' as const,
    text: 'textSuccess' as const,
  },
  operator: {
    base: 'backgroundBasePrimary' as const,
    active: 'backgroundLightPrimary' as const,
    text: 'textPrimary' as const,
  },
  conjunction: {
    base: 'backgroundBaseSubdued' as const,
    active: 'backgroundLightText' as const,
    text: 'textSubdued' as const,
  },
  recentSearch: {
    base: 'backgroundBaseSubdued' as const,
    active: 'backgroundLightText' as const,
    text: 'textSubdued' as const,
  },
};

const activeColors = (context: UseEuiTheme) =>
  Object.entries(kbnTypeaheadTypes).map(([type, color]) => {
    return {
      [`.kbnSuggestionItem--${type}`]: {
        '.kbnSuggestionItem__type': {
          backgroundColor: context.euiTheme.colors[color.active],
        },
      },
    };
  });

const tokenColors = (context: UseEuiTheme) =>
  Object.entries(kbnTypeaheadTypes).map(([type, color]) => {
    return {
      [`&.kbnSuggestionItem--${type}`]: {
        '.kbnSuggestionItem__type': {
          backgroundColor: context.euiTheme.colors[color.base],
          color: context.euiTheme.colors[color.text],
        },
      },
    };
  });

const suggestionStyles: EmotionStyles = {
  suggestionItem: (context: UseEuiTheme) =>
    css({
      '&.kbnTypeahead__item': {
        height: context.euiTheme.size.xl,
        whiteSpace: 'nowrap',
        fontSize: euiFontSize(context, 'xs').fontSize,
        verticalAlign: 'middle',
        padding: 0,
        borderBottom: 'none',
        lineHeight: 'normal',
        '&:hover': {
          cursor: 'pointer',
        },
        '&:last-child': {
          borderBottom: 'none',
          borderRadius: `0 0 ${context.euiTheme.border.radius.medium} ${context.euiTheme.border.radius.medium}`,
        },
        '&:first-child': {
          borderBottom: 'none',
        },

        '&.active': css([
          {
            backgroundColor: context.euiTheme.colors.lightestShade,
            '.kbnSuggestionItem__callout': {
              background: context.euiTheme.colors.emptyShade,
            },
            '.kbnSuggestionItem__text': {
              color: context.euiTheme.colors.fullShade,
            },
            '.kbnSuggestionItem__type': {
              color: context.euiTheme.colors.fullShade,
            },
          },
          activeColors(context),
        ]),
      },

      '.kbnSuggestionItem': css([
        tokenColors(context),
        {
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: euiFontSize(context, 'xs').fontSize,
          whiteSpace: 'nowrap',
          width: '100%',
        },
      ]),
      '.kbnSuggestionItem__type': {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 'auto',
        width: context.euiTheme.size.xl,
        height: context.euiTheme.size.xl,
        textAlign: 'center',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        padding: context.euiTheme.size.xs,
      },
      '.kbnSuggestionItem__text': {
        fontFamily: context.euiTheme.font.familyCode,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingLeft: context.euiTheme.size.s,
        color: context.euiTheme.colors.text,
        minWidth: '250px',
      },
      '.kbnSuggestionItem__description': {
        color: context.euiTheme.colors.darkShade,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexShrink: 1,
        // In case the description contains a paragraph in which the truncation needs to be at this level
        '> p': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        '&:empty': {
          width: 0,
        },
      },
      '.kbnSuggestionItem__callout': {
        fontFamily: context.euiTheme.font.familyCode,
        background: context.euiTheme.colors.lightestShade,
        color: context.euiTheme.colors.fullShade,
        padding: `0 ${context.euiTheme.size.xs}`,
        display: 'inline-block',
      },
    }),
};
