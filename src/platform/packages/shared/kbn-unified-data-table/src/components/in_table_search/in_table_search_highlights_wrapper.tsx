/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import { escapeRegExp, memoize } from 'lodash';

export interface InTableSearchHighlightsWrapperProps {
  inTableSearchTerm?: string;
  onHighlightsCountFound?: (count: number) => void;
  children: ReactNode;
}

export const InTableSearchHighlightsWrapper: React.FC<InTableSearchHighlightsWrapperProps> = ({
  inTableSearchTerm,
  onHighlightsCountFound,
  children,
}) => {
  const cellValueRef = useRef<HTMLDivElement | null>(null);
  const renderedForSearchTerm = useRef<string>();

  useEffect(() => {
    if (
      inTableSearchTerm &&
      cellValueRef.current &&
      renderedForSearchTerm.current !== inTableSearchTerm
    ) {
      renderedForSearchTerm.current = inTableSearchTerm;
      const count = modifyDOMAndAddSearchHighlights(
        cellValueRef.current,
        inTableSearchTerm,
        Boolean(onHighlightsCountFound)
      );
      onHighlightsCountFound?.(count);
    }
  }, [inTableSearchTerm, onHighlightsCountFound]);

  return <div ref={cellValueRef}>{children}</div>;
};

const getSearchTermRegExp = memoize((searchTerm: string): RegExp => {
  return new RegExp(`(${escapeRegExp(searchTerm.trim())})`, 'gi');
});

function modifyDOMAndAddSearchHighlights(
  originalNode: Node,
  inTableSearchTerm: string,
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
      const parts = (nodeWithText.textContent || '').split(searchTermRegExp);

      if (dryRun) {
        parts.forEach((part) => {
          if (searchTermRegExp.test(part)) {
            matchIndex++;
          }
        });
        return;
      }

      if (parts.length > 1) {
        const nodeWithHighlights = document.createDocumentFragment();

        parts.forEach((part) => {
          if (searchTermRegExp.test(part)) {
            const mark = document.createElement('mark');
            mark.textContent = part;
            mark.setAttribute('class', 'unifiedDataTable__inTableSearchMatch');
            mark.setAttribute('data-match-index', `${matchIndex++}`);
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
