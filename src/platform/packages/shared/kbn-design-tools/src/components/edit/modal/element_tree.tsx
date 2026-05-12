/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import { SVG_INTERNALS } from '../../../lib/constants';
import { resolveTag } from '../../../lib/fiber';

interface TreeNode {
  tag: string;
  depth: number;
  element: Element;
  hasChildren: boolean;
  isClosing?: boolean;
}

const flatten = (el: Element, depth: number): TreeNode[] => {
  const tag = resolveTag(el);
  const children = Array.from(el.children);
  const nodes: TreeNode[] = [];

  // Treat SVG containers as leaf nodes — don't recurse into path/g/circle etc.
  const isSvg = el.tagName.toLowerCase() === 'svg';
  const isSvgInternal = SVG_INTERNALS.has(el.tagName.toLowerCase());

  if (isSvgInternal) {
    return nodes;
  }

  if (children.length === 0 || isSvg) {
    nodes.push({ tag, depth, element: el, hasChildren: false });
    return nodes;
  }

  nodes.push({ tag, depth, element: el, hasChildren: true });
  for (const child of children) {
    nodes.push(...flatten(child, depth + 1));
  }
  nodes.push({ tag, depth, element: el, hasChildren: true, isClosing: true });
  return nodes;
};

interface Props {
  root: Element;
  selectedElement: Element | null;
  onSelect: (element: Element) => void;
}

export const ElementTree = ({ root, selectedElement, onSelect }: Props) => {
  const { euiTheme } = useEuiTheme();
  const nodes = useMemo(() => flatten(root, 0), [root]);

  const containerCss = useMemo(
    () =>
      css({
        fontFamily: euiTheme.font.familyCode,
        fontSize: euiTheme.size.m,
        lineHeight: '20px',
        overflowY: 'auto',
        overflowX: 'auto',
        padding: `${euiTheme.size.s}`,
        background: euiTheme.colors.backgroundBaseSubdued,
        borderRadius: euiTheme.border.radius.small,
        flex: 1,
        minHeight: 0,
      }),
    [euiTheme]
  );

  const lineCss = useMemo(
    () =>
      css({
        padding: '0 4px',
        cursor: 'pointer',
        whiteSpace: 'pre',
        borderRadius: '2px',
        '&:hover': {
          background: euiTheme.colors.backgroundBaseInteractiveHover,
        },
      }),
    [euiTheme]
  );

  const selectedCss = useMemo(
    () =>
      css({
        background: euiTheme.colors.backgroundLightPrimary,
        '&:hover': {
          background: euiTheme.colors.backgroundLightPrimary,
        },
      }),
    [euiTheme]
  );

  const bracketColor = euiTheme.colors.textSubdued;
  const tagColor = euiTheme.colors.textPrimary;

  return (
    <div className={containerCss}>
      {nodes.map((node, i) => {
        const isSelected = node.element === selectedElement;
        const indent = '  '.repeat(node.depth);

        return (
          <div
            key={i}
            className={`${lineCss} ${isSelected ? selectedCss : ''}`}
            onClick={() => onSelect(node.element)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(node.element);
            }}
          >
            <span style={{ color: bracketColor }}>{indent}&lt;</span>
            {node.isClosing && <span style={{ color: bracketColor }}>/</span>}
            <span style={{ color: tagColor }}>{node.tag}</span>
            {!node.isClosing && !node.hasChildren && (
              <span style={{ color: bracketColor }}> /</span>
            )}
            <span style={{ color: bracketColor }}>&gt;</span>
          </div>
        );
      })}
    </div>
  );
};
