/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useEuiTheme, EuiButtonIcon } from '@elastic/eui';
import { Label } from './label';

const NUMBER_COLORS = {
  dark: '#54B399',
  light: '#357160',
};

const STRING_COLORS = {
  dark: '#d97797',
  light: '#a34a68',
};

const BOOLEAN_COLORS = {
  dark: '#a68ac5',
  light: '#765b96',
};

const getValueColor = (type: string) => {
  switch (type) {
    case 'boolean':
      return BOOLEAN_COLORS;
    case 'number':
      return NUMBER_COLORS;
    case 'string':
    default:
      return STRING_COLORS;
  }
};

export const TreeChild = ({
  node,
  i,
  isDarkMode,
  isRootElement,
  parent,
}: {
  node: Record<string, unknown>;
  i: number;
  isDarkMode: boolean;
  isRootElement?: boolean;
  parent?: unknown;
}) => {
  const [expanded, setExpanded] = useState(isRootElement);

  const handleExpandElement = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const itemLabelProps = {
    node,
    i,
    isRootElement,
    parent,
  };

  const { euiTheme } = useEuiTheme();
  const mode = isDarkMode ? 'dark' : 'light';

  return (
    <>
      <>
        <EuiButtonIcon
          iconSize="s"
          size="xs"
          iconType={expanded ? 'minus' : 'plus'}
          aria-label={
            expanded
              ? i18n.translate('jsonTree.minimizeNode.label', {
                  defaultMessage: 'Minimize',
                })
              : i18n.translate('jsonTree.expandNode.label', {
                  defaultMessage: 'Expand',
                })
          }
          onClick={handleExpandElement}
        />
        <Label {...itemLabelProps} />
      </>
      {expanded &&
        node &&
        Object.keys(node).map((nodeKey, n) => {
          // I don't want to display the undefined / null values
          if (node[nodeKey] == null) return null;
          const valueType = typeof node[nodeKey];
          const colorsObject = getValueColor(valueType);
          return (
            <div
              key={n}
              css={css`
                font-family: ${euiTheme.font.familyCode};
                margin-left: ${euiTheme.size.base};
              `}
            >
              {typeof node[nodeKey] !== 'object' ? (
                <>
                  <span>{nodeKey}</span> :
                  <span
                    css={css`
                      color: ${colorsObject[mode]};
                    `}
                  >{` ${node[nodeKey]}`}</span>
                </>
              ) : (
                <TreeChild
                  node={node[nodeKey] as Record<string, unknown>}
                  i={i}
                  parent={nodeKey}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          );
        })}
    </>
  );
};
