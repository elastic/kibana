/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/public';

export function buildCSS(maxHeight = 0, truncateGradientHeight = 15) {
  return `
.truncate-by-height {
  max-height: ${maxHeight > 0 ? `${maxHeight}px !important` : 'none'};
  display: inline-block;
}
.truncate-by-height:before {
  top:  ${maxHeight > 0 ? maxHeight - truncateGradientHeight : truncateGradientHeight * -1}px;
}
`;
}

export function injectHeaderStyle(uiSettings: IUiSettingsClient) {
  const style = document.createElement('style');
  style.setAttribute('id', 'style-compile');
  document.getElementsByTagName('head')[0].appendChild(style);

  uiSettings.get$('truncate:maxHeight').subscribe((value: number) => {
    // eslint-disable-next-line no-unsanitized/property
    style.innerHTML = buildCSS(value);
  });
}
