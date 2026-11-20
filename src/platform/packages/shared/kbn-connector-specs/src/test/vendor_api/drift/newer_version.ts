/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManifestSource } from '../manifest';

export interface NewerVersion {
  /** The version the source's URL names. */
  readonly current: string;
  /** The highest version the vendor's page names. */
  readonly latest: string;
}

const compareVersions = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true });

/**
 * Whether the vendor names a version above the one in the source's URL: the highest version that
 * the source's `latest` pattern finds in the page it names, against the version it finds in the
 * URL. Throws when the page names no version, which means the page changed, not the vendor's API.
 */
export const findNewerVersion = async (
  {
    url,
    latest,
  }: Pick<ManifestSource, 'url'> & { readonly latest: NonNullable<ManifestSource['latest']> },
  fetchText: (url: string) => Promise<string>
): Promise<NewerVersion | undefined> => {
  const current = new RegExp(latest.pattern).exec(url)?.[1];
  if (current === undefined) {
    throw new Error(`${latest.pattern} finds no version in ${url}`);
  }
  const page = await fetchText(latest.url);
  const versions = [...page.matchAll(new RegExp(latest.pattern, 'g'))].flatMap(([, version]) =>
    version === undefined ? [] : [version]
  );
  const [highest] = versions.sort((a, b) => compareVersions(b, a));
  if (highest === undefined) {
    throw new Error(`${latest.pattern} finds no version in ${latest.url}`);
  }
  return compareVersions(highest, current) > 0 ? { current, latest: highest } : undefined;
};
