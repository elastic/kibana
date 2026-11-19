/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createInspectHost, INSPECT_COMPONENT_ROUTE } from './create_inspect_host';

describe('createInspectHost', () => {
  const http = httpServiceMock.createStartContract();
  const fileName = '/Users/dev/kibana/src/path/to/component.tsx';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveFileData', () => {
    it('should call the inspect route with the file path', async () => {
      const host = createInspectHost({ http, branch: 'main' });

      await host.resolveFileData(fileName);

      expect(http.post).toHaveBeenCalledWith(INSPECT_COMPONENT_ROUTE, {
        body: JSON.stringify({ path: fileName }),
      });
    });

    it('should map the route response to file data', async () => {
      http.post.mockResolvedValueOnce({
        codeowners: ['@elastic/team-capybara'],
        relativePath: 'src/path/to/component.tsx',
        baseFileName: 'component.tsx',
      });
      const host = createInspectHost({ http, branch: 'main' });

      await expect(host.resolveFileData(fileName)).resolves.toEqual({
        codeowners: ['@elastic/team-capybara'],
        relativePath: 'src/path/to/component.tsx',
        baseFileName: 'component.tsx',
      });
    });

    it('should return null when the request fails', async () => {
      http.post.mockRejectedValueOnce(new Error('Network error'));
      const host = createInspectHost({ http, branch: 'main' });

      await expect(host.resolveFileData(fileName)).resolves.toBeNull();
    });
  });

  describe('getSourceLinks', () => {
    it('should point GitHub links at elastic/kibana on the given branch', () => {
      const host = createInspectHost({ http, branch: '9.3' });

      const [github, githubDev] = host.getSourceLinks({
        fileName,
        relativePath: 'src/path/to/component.tsx',
        lineNumber: 42,
        columnNumber: 15,
      });

      expect(github.href).toBe(
        'https://github.com/elastic/kibana/blob/9.3/src/path/to/component.tsx#L42'
      );
      expect(githubDev.href).toBe(
        'https://github.dev/elastic/kibana/blob/9.3/src/path/to/component.tsx#L42'
      );
    });
  });

  describe('getCodeownerHref', () => {
    it('should link @elastic teams to their GitHub team page', () => {
      const host = createInspectHost({ http, branch: 'main' });

      expect(host.getCodeownerHref?.('@elastic/team-capybara')).toBe(
        'https://github.com/orgs/elastic/teams/team-capybara'
      );
    });

    it('should not link owners outside the elastic org', () => {
      const host = createInspectHost({ http, branch: 'main' });

      expect(host.getCodeownerHref?.('@someone')).toBeUndefined();
    });
  });

  it('should leave the flyout color mode to the live EUI theme', () => {
    expect(createInspectHost({ http, branch: 'main' }).colorMode).toBeUndefined();
  });
});
