/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createGithubSourceLinks } from './create_github_source_links';

describe('createGithubSourceLinks', () => {
  const location = {
    fileName: '/Users/test/kibana/src/components/example/component.tsx',
    relativePath: 'src/components/example/component.tsx',
    lineNumber: 42,
    columnNumber: 15,
  };

  it('should build GitHub and editor links for the given repo and branch', () => {
    const links = createGithubSourceLinks({ repo: 'elastic/kibana', branch: 'main' })(location);

    expect(links).toEqual([
      {
        id: 'github',
        label: 'GitHub',
        href: 'https://github.com/elastic/kibana/blob/main/src/components/example/component.tsx#L42',
        iconType: 'logoGithub',
      },
      {
        id: 'githubDev',
        label: 'GitHub.dev',
        href: 'https://github.dev/elastic/kibana/blob/main/src/components/example/component.tsx#L42',
        iconType: 'logoGithub',
      },
      {
        id: 'vscode',
        label: 'VSCode',
        href: 'vscode://file//Users/test/kibana/src/components/example/component.tsx:42:15',
        iconType: 'code',
      },
      {
        id: 'webstorm',
        label: 'WebStorm',
        href: 'webstorm://open?file=//Users/test/kibana/src/components/example/component.tsx&line=42&column=15',
        iconType: 'code',
      },
      {
        id: 'cursor',
        label: 'Cursor',
        href: 'cursor://file//Users/test/kibana/src/components/example/component.tsx:42:15',
        iconType: 'code',
      },
    ]);
  });

  it('should use the configured repository slug', () => {
    const [github] = createGithubSourceLinks({ repo: 'elastic/cloud-ui', branch: 'feature' })(
      location
    );

    expect(github.href).toBe(
      'https://github.com/elastic/cloud-ui/blob/feature/src/components/example/component.tsx#L42'
    );
  });
});
