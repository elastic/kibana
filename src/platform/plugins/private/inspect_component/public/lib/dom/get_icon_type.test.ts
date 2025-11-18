/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIconType } from './get_icon_type';
import { EUI_DATA_ICON_TYPE } from '../constants';

describe('getIconType', () => {
  it('should return icon type from HTML element with SVG child that has EUI_DATA_ICON_TYPE attribute', () => {
    const divElement = document.createElement('div');
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute(EUI_DATA_ICON_TYPE, 'arrowDown');
    divElement.appendChild(svgElement);

    const iconType = getIconType(divElement);

    expect(iconType).toBe('arrowDown');
  });

  it('should return null from HTML element with SVG child without EUI_DATA_ICON_TYPE attribute', () => {
    const divElement = document.createElement('div');
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    divElement.appendChild(svgElement);

    const iconType = getIconType(divElement);

    expect(iconType).toBeNull();
  });

  it('should return null from HTML element without SVG child', () => {
    const divElement = document.createElement('div');

    const iconType = getIconType(divElement);

    expect(iconType).toBeNull();
  });
});
