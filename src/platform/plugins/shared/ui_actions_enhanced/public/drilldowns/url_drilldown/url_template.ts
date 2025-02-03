/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export async function compile(
  urlTemplate: string,
  context: object,
  doEncode: boolean = true
): Promise<string> {
  const { handlebars } = await import('./handlebars');
  const { compileFnName } = await import('@kbn/handlebars');
  const handlebarsTemplate = handlebars[compileFnName](urlTemplate, {
    strict: true,
    noEscape: true,
  });

  let processedUrl: string = handlebarsTemplate(context);

  if (doEncode) {
    processedUrl = encodeURI(processedUrl);
  }

  return processedUrl;
}
