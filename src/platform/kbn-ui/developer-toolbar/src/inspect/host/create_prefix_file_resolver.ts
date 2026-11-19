/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InspectFileData } from '../types';

/** Options for {@link createPrefixFileResolver}. */
export interface CreatePrefixFileResolverOptions {
  /** Absolute path of the repository root, e.g. `/Users/me/repos/cloud-ui/`. */
  repoRoot: string;
}

const toPosixPath = (path: string) => path.replace(/\\/g, '/');

/**
 * Creates an `InspectHostConfig.resolveFileData` implementation that strips `repoRoot`
 * from the absolute `_debugSource` path client-side. Codeowners are not resolved.
 */
export const createPrefixFileResolver = ({
  repoRoot,
}: CreatePrefixFileResolverOptions): ((fileName: string) => Promise<InspectFileData | null>) => {
  const normalizedRoot = toPosixPath(repoRoot).replace(/\/*$/, '/');

  return async (fileName: string): Promise<InspectFileData | null> => {
    const normalizedFileName = toPosixPath(fileName);

    if (!normalizedFileName.startsWith(normalizedRoot)) {
      return null;
    }

    const relativePath = normalizedFileName.slice(normalizedRoot.length);
    const baseFileName = relativePath.slice(relativePath.lastIndexOf('/') + 1);

    if (!baseFileName) {
      return null;
    }

    return { relativePath, baseFileName };
  };
};
