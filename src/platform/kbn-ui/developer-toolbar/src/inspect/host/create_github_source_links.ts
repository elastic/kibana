/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InspectSourceLink, InspectSourceLocation } from '../types';

/** Options for {@link createGithubSourceLinks}. */
export interface CreateGithubSourceLinksOptions {
  /** GitHub repository slug, e.g. `elastic/kibana`. */
  repo: string;
  /** Branch (or any git ref) the links point to. */
  branch: string;
}

/**
 * Creates an `InspectHostConfig.getSourceLinks` implementation with GitHub, github.dev,
 * VS Code, WebStorm and Cursor links.
 */
export const createGithubSourceLinks =
  ({ repo, branch }: CreateGithubSourceLinksOptions) =>
  ({
    fileName,
    relativePath,
    lineNumber,
    columnNumber,
  }: InspectSourceLocation): InspectSourceLink[] =>
    [
      {
        id: 'github',
        label: 'GitHub',
        href: `https://github.com/${repo}/blob/${branch}/${relativePath}#L${lineNumber}`,
        iconType: 'logoGithub',
      },
      {
        id: 'githubDev',
        label: 'GitHub.dev',
        href: `https://github.dev/${repo}/blob/${branch}/${relativePath}#L${lineNumber}`,
        iconType: 'logoGithub',
      },
      {
        id: 'vscode',
        label: 'VSCode',
        href: `vscode://file/${fileName}:${lineNumber}:${columnNumber}`,
        iconType: 'code',
      },
      {
        id: 'webstorm',
        label: 'WebStorm',
        href: `webstorm://open?file=/${fileName}&line=${lineNumber}&column=${columnNumber}`,
        iconType: 'code',
      },
      {
        id: 'cursor',
        label: 'Cursor',
        href: `cursor://file/${fileName}:${lineNumber}:${columnNumber}`,
        iconType: 'code',
      },
    ];
