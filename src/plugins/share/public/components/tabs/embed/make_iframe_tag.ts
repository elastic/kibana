/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const makeIframeTag = (url: string) => {
  if (!url) {
    return;
  }

  let tempUrl = url;

  const embedParam = '?embed=true';
  const urlHasQueryString = tempUrl.indexOf('?') !== -1;

  if (urlHasQueryString) {
    tempUrl = tempUrl.replace('?', `${embedParam}&`);
  } else {
    tempUrl = `${tempUrl}${embedParam}`;
  }

  return `<iframe src="${tempUrl}" height="600" width="800"></iframe>`;
};
