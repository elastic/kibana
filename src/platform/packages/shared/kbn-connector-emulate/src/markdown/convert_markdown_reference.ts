/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '../openapi/types';
import { parseBravePage } from './parse_brave';
import { parseDatabricksPage } from './parse_databricks';
import type { ReferenceServer } from './to_openapi';
import { toOpenApi } from './to_openapi';
import type {
  MarkdownReferencePage,
  ParsedPage,
  ReferenceEndpoint,
  ReferenceObject,
} from './types';

interface ReferenceFormat {
  readonly title: string;
  readonly parse: (url: string, markdown: string) => ParsedPage;
  readonly servers?: readonly ReferenceServer[];
}

// One parser per vendor template; the conversion to OpenAPI is shared.
const FORMATS = {
  'databricks-markdown': {
    title: 'Databricks REST API',
    parse: parseDatabricksPage,
    // Each customer has their own workspace host.
    servers: [
      {
        url: 'https://{workspace}',
        variables: { workspace: { default: 'example.cloud.databricks.com' } },
      },
    ],
  },
  'brave-markdown': { title: 'Brave Search API', parse: parseBravePage },
} satisfies Readonly<Record<string, ReferenceFormat>>;

export type MarkdownReferenceFormat = keyof typeof FORMATS;

export const MARKDOWN_REFERENCE_FORMATS = Object.keys(FORMATS) as MarkdownReferenceFormat[];

export const isMarkdownReferenceFormat = (format: string): format is MarkdownReferenceFormat =>
  Object.hasOwn(FORMATS, format);

export interface MarkdownReferenceOptions {
  readonly format: MarkdownReferenceFormat;
  /** The fetched pages: endpoint pages, and the object pages they refer to. */
  readonly pages: readonly MarkdownReferencePage[];
  readonly title?: string;
  /** `info.version`; pages carry no version of the reference as a whole. */
  readonly version?: string;
}

/**
 * Converts the pages of a Markdown API reference, written from one of the vendor templates in
 * `MARKDOWN_REFERENCE_FORMATS`, to an OpenAPI 3.0 document. Pages that describe neither an
 * endpoint nor an object, such as guides and index pages, are skipped.
 */
export const convertMarkdownReference = ({
  format,
  pages,
  title,
  version = '1',
}: MarkdownReferenceOptions): OpenApiDocument => {
  const reference: ReferenceFormat = FORMATS[format];
  const endpoints: ReferenceEndpoint[] = [];
  const objects: ReferenceObject[] = [];
  for (const { url, markdown } of pages) {
    const parsed = reference.parse(url, markdown);
    if (parsed && 'endpoint' in parsed) {
      endpoints.push(parsed.endpoint);
    } else if (parsed) {
      objects.push(parsed.object);
    }
  }
  return toOpenApi({
    title: title ?? reference.title,
    version,
    servers: reference.servers,
    endpoints,
    objects,
  });
};

// Neither the text nor the target may contain `[`, so a failed match never rescans what follows.
const LINK = /\[[^\][]*\]\(([^)\s[]+\.md)\)/g;

const resolveLink = (link: string, indexUrl: URL): string | undefined => {
  try {
    const url = new URL(link, indexUrl);
    return url.origin === indexUrl.origin ? url.href : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The Markdown pages an `llms.txt` index links to (https://llmstxt.org), as absolute URLs
 * resolved against the index's URL, in order and without duplicates. Links to another origin
 * and links that aren't valid URLs are skipped, so the index can't point a fetch elsewhere.
 */
export const readLlmsIndex = (text: string, indexUrl: string): string[] => {
  const index = new URL(indexUrl);
  return [
    ...new Set([...text.matchAll(LINK)].flatMap(([, link]) => resolveLink(link, index) ?? [])),
  ];
};
