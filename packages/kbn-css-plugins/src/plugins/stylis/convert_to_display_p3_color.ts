/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// eslint-disable-next-line import/no-extraneous-dependencies
import { DECLARATION, hash, type Element } from 'stylis';
import { getDisplayP3Color } from '../../common/get_display_p3_color';

const getDisplayP3ColorWithFallback = (element: Element) => {
  const [key, value] = element.value.split(':');
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('rgba')) {
    return `${element.return} ${key}: ${getDisplayP3Color(value.slice(0, -1))};`;
  }
  return element.return;
};

export const toDisplayP3ColorStylis = (element: Element) => {
  if (element.type !== DECLARATION) return;

  switch (hash(element.value, element.length)) {
    case 3959: // background-color
    case 6895: // color
    case 5084: // border-color
    case 5207: // scrollbar-color
    case 4140: // outline-color
    case 1756: // border-inline-start-color
      element.return = getDisplayP3ColorWithFallback(element);
      break;
  }
};
