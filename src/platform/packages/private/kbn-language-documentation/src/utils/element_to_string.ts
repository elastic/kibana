/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { isValidElement } from 'react';

function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

/**
 * Gets the JSX.Element as the input. It returns the markdown as string.
 * If the children are not markdown it will return an empty string.
 */
export function elementToString(element?: JSX.Element): string {
  if (!element) {
    return '';
  }
  const props = element.props;
  if (props && 'markdownContent' in props) {
    return String(props.markdownContent);
  } else if (props && 'children' in props && Array.isArray(props.children)) {
    return props.children.reduce((text: string, child: React.ReactNode): string => {
      const validChildren = React.Children.toArray(child).filter(nonNullable);
      if (isValidElement(child) && validChildren.length > 0) {
        return text.concat(elementToString(child));
      }
      return text;
    }, '');
  }
  return '';
}
