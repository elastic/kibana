/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import cheerio from 'cheerio';

export function getNoteFromDescription(descriptionHtml: string, header: string) {
  const re = new RegExp(`^(\\s*${header.toLowerCase()}(?:s)?\\s*:?\\s*)`, 'i');
  const $ = cheerio.load(descriptionHtml);
  for (const el of $('p,h1,h2,h3,h4,h5').toArray()) {
    const text = $(el).text();
    const match = text.match(re);

    if (!match) {
      continue;
    }

    const note = text.replace(match[1], '').trim();
    return note || $(el).next().text().trim();
  }
}
