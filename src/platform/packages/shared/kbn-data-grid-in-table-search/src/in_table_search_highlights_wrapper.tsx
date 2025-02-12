/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { escapeRegExp } from 'lodash';
import { HIGHLIGHT_CLASS_NAME, CELL_MATCH_INDEX_ATTRIBUTE } from './constants';
import { InTableSearchHighlightsWrapperProps } from './types';

/**
 * Counts and highlights search term matches in the children of the component
 */
export const InTableSearchHighlightsWrapper: React.FC<InTableSearchHighlightsWrapperProps> = ({
  inTableSearchTerm,
  highlightColor,
  highlightBackgroundColor,
  onHighlightsCountFound,
  children,
}) => {
  const cellValueRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dryRun = Boolean(onHighlightsCountFound); // only to count highlights, not to modify the DOM
  const shouldCallCallbackRef = useRef<boolean>(dryRun);

  useEffect(() => {
    if (inTableSearchTerm && cellValueRef.current) {
      const cellNode = cellValueRef.current;

      const searchForMatches = () => {
        const count = modifyDOMAndAddSearchHighlights(
          cellNode,
          inTableSearchTerm,
          highlightColor,
          highlightBackgroundColor,
          dryRun
        );
        if (shouldCallCallbackRef.current) {
          shouldCallCallbackRef.current = false;
          onHighlightsCountFound?.(count);
        }
      };

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(searchForMatches, 0);
    }
  }, [
    dryRun,
    inTableSearchTerm,
    highlightColor,
    highlightBackgroundColor,
    children,
    onHighlightsCountFound,
  ]);

  return <div ref={cellValueRef}>{children}</div>;
};

const searchTermRegExpCache = new Map<string, RegExp>();

const getSearchTermRegExp = (searchTerm: string): RegExp => {
  if (searchTermRegExpCache.has(searchTerm)) {
    return searchTermRegExpCache.get(searchTerm)!;
  }

  const searchTermRegExp = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, 'gi');
  searchTermRegExpCache.set(searchTerm, searchTermRegExp);
  return searchTermRegExp;
};

export const clearSearchTermRegExpCache = () => {
  searchTermRegExpCache.clear();
};

function modifyDOMAndAddSearchHighlights(
  originalNode: Node,
  inTableSearchTerm: string,
  highlightColor: string,
  highlightBackgroundColor: string,
  dryRun: boolean
): number {
  let matchIndex = 0;
  const searchTermRegExp = getSearchTermRegExp(inTableSearchTerm);

  function insertSearchHighlights(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(insertSearchHighlights);
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const nodeWithText = node as Text;
      const textContent = nodeWithText.textContent || '';

      if (dryRun) {
        const nodeMatchesCount = (textContent.match(searchTermRegExp) || []).length;
        matchIndex += nodeMatchesCount;
        return;
      }

      const parts = textContent.split(searchTermRegExp);

      if (parts.length > 1) {
        const nodeWithHighlights = document.createDocumentFragment();

        parts.forEach(function insertHighlights(part) {
          if (searchTermRegExp.test(part)) {
            const mark = document.createElement('mark');
            mark.textContent = part;
            mark.style.color = highlightColor;
            mark.style.backgroundColor = highlightBackgroundColor;
            mark.setAttribute('class', HIGHLIGHT_CLASS_NAME);
            mark.setAttribute(CELL_MATCH_INDEX_ATTRIBUTE, `${matchIndex++}`);
            nodeWithHighlights.appendChild(mark);
          } else {
            nodeWithHighlights.appendChild(document.createTextNode(part));
          }
        });

        nodeWithText.replaceWith(nodeWithHighlights);
      }
    }
  }

  Array.from(originalNode.childNodes).forEach(insertSearchHighlights);

  return matchIndex;
}
