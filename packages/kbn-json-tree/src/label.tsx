/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

const getLabel = (
  node: Record<string, unknown>,
  i: number,
  isRootElement: boolean | undefined,
  parent: unknown
) => {
  const childIsArray = Array.isArray(node);
  const childIsObjectLiteral = typeof node === 'object' && !childIsArray;
  const numChildren = Object.keys(node).length;

  if (childIsArray) {
    return {
      text: parent || '',
      decorator: `[${node.length}]`,
    };
  } else if (childIsObjectLiteral) {
    return {
      text: parent || '',
      decorator: `{${numChildren}}`,
    };
  } else {
    return {
      text: `${i}` || '',
      decorator: `{${numChildren}}`,
    };
  }
};

export const Label = ({
  node,
  i,
  isRootElement,
  parent,
}: {
  node: Record<string, unknown>;
  i: number;
  isRootElement?: boolean;
  parent?: unknown;
}) => {
  const { text, decorator } = getLabel(node, i, isRootElement, parent) ?? {};
  return (
    <span>
      {text}
      {decorator}
    </span>
  );
};
