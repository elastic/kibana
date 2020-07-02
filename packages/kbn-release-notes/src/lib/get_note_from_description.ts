/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import cheerio from 'cheerio';

export function getNoteFromDescription(descriptionHtml: string) {
  const $ = cheerio.load(descriptionHtml);
  for (const el of $('p,h1,h2,h3,h4,h5').toArray()) {
    const text = $(el).text();
    const match = text.match(/^(\s*release note(?:s)?\s*:?\s*)/i);

    if (!match) {
      continue;
    }

    const note = text.replace(match[1], '').trim();
    return note || $(el).next().text().trim();
  }
}
