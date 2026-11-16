/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MarkdownReferencePage, OpenApiDocument } from '@kbn/connector-emulate';
import { convertMarkdownReference, readLlmsIndex } from '@kbn/connector-emulate';
import type { MarkdownSourceFormat } from './manifest';

// Reference pages are small; a few at a time keeps a large API group quick without hammering the docs host.
const CONCURRENCY = 8;

export interface LoadMarkdownReferenceOptions {
  readonly format: MarkdownSourceFormat;
  /** The reference's `llms.txt` index. */
  readonly url: string;
  /**
   * URL prefixes, absolute or relative to the index, of the pages to fetch, such as an API
   * group's folder (`workspace/jobs/`). Every page the index links to without them.
   */
  readonly pages?: readonly string[];
  readonly fetchText: (url: string) => Promise<string>;
}

const mapConcurrently = async <T, R>(
  items: readonly T[],
  map: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const work = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await map(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, work));
  return results;
};

/**
 * Fetches the pages of a Markdown API reference that its `llms.txt` index links to, limited to
 * `pages`, and converts them to OpenAPI. Fails when a prefix selects no page, as the vendor may
 * have moved the group, so a source can't silently shrink.
 */
export const loadMarkdownReference = async ({
  format,
  url,
  pages,
  fetchText,
}: LoadMarkdownReferenceOptions): Promise<OpenApiDocument> => {
  const links = readLlmsIndex(await fetchText(url), url);
  const prefixes = (pages ?? []).map((prefix) => ({ prefix, href: new URL(prefix, url).href }));
  const unused = prefixes.filter(({ href }) => !links.some((link) => link.startsWith(href)));
  if (unused.length > 0) {
    throw new Error(
      `${url} links to no page under ${unused
        .map(({ prefix }) => `"${prefix}"`)
        .join(', ')}; correct "pages"`
    );
  }
  const selected =
    prefixes.length === 0
      ? links
      : links.filter((link) => prefixes.some(({ href }) => link.startsWith(href)));
  if (selected.length === 0) {
    throw new Error(`${url} links to no Markdown page`);
  }
  const fetched = await mapConcurrently(
    selected,
    async (link): Promise<MarkdownReferencePage> => ({
      url: link,
      markdown: await fetchText(link),
    })
  );
  return convertMarkdownReference({ format, pages: fetched });
};
