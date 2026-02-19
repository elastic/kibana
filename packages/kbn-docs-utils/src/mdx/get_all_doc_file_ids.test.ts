/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import globby from 'globby';
import { getAllDocFileIds } from './get_all_doc_file_ids';

jest.mock('fs/promises');
jest.mock('globby');

const mockFsp = Fsp as jest.Mocked<typeof Fsp>;
const mockGlobby = globby as jest.MockedFunction<typeof globby>;

describe('getAllDocFileIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns doc IDs from mdx files with valid frontmatter', async () => {
    mockGlobby.mockResolvedValue(['/output/plugin_a.mdx', '/output/plugin_b.mdx']);

    mockFsp.readFile.mockImplementation(async (filePath) => {
      if (filePath === '/output/plugin_a.mdx') {
        return `---
id: kibPluginAPluginApi
slug: /kibana-dev-docs/api/pluginA
title: "pluginA"
---
Content here`;
      }
      if (filePath === '/output/plugin_b.mdx') {
        return `---
id: kibPluginBPluginApi
slug: /kibana-dev-docs/api/pluginB
title: "pluginB"
---
Content here`;
      }
      throw new Error(`Unexpected file: ${filePath}`);
    });

    const ids = await getAllDocFileIds('/output');

    expect(ids).toEqual(['kibPluginAPluginApi', 'kibPluginBPluginApi']);
  });

  it('handles empty directory', async () => {
    mockGlobby.mockResolvedValue([]);

    const ids = await getAllDocFileIds('/output');

    expect(ids).toEqual([]);
  });

  it('throws error when frontmatter start is missing', async () => {
    mockGlobby.mockResolvedValue(['/output/bad.mdx']);
    mockFsp.readFile.mockResolvedValue('No frontmatter here');

    await expect(getAllDocFileIds('/output')).rejects.toThrow(
      'unable to find start of frontmatter'
    );
  });

  it('throws error when frontmatter end is missing', async () => {
    mockGlobby.mockResolvedValue(['/output/bad.mdx']);
    mockFsp.readFile.mockResolvedValue(`---
id: someId
No closing frontmatter`);

    await expect(getAllDocFileIds('/output')).rejects.toThrow('unable to find end of frontmatter');
  });

  it('throws error when frontmatter contains invalid YAML', async () => {
    mockGlobby.mockResolvedValue(['/output/bad.mdx']);
    mockFsp.readFile.mockResolvedValue(`---
id: [invalid yaml
---
Content`);

    await expect(getAllDocFileIds('/output')).rejects.toThrow('unable to parse frontmatter');
  });

  it('throws error when frontmatter is not an object', async () => {
    mockGlobby.mockResolvedValue(['/output/bad.mdx']);
    mockFsp.readFile.mockResolvedValue(`---
just a string
---
Content`);

    await expect(getAllDocFileIds('/output')).rejects.toThrow('expected yaml to produce an object');
  });

  it('throws error when id is missing from frontmatter', async () => {
    mockGlobby.mockResolvedValue(['/output/bad.mdx']);
    mockFsp.readFile.mockResolvedValue(`---
slug: /some/path
title: "Some Title"
---
Content`);

    await expect(getAllDocFileIds('/output')).rejects.toThrow('missing "id" in frontmatter');
  });

  it('throws error when id is not a string', async () => {
    mockGlobby.mockResolvedValue(['/output/bad.mdx']);
    mockFsp.readFile.mockResolvedValue(`---
id: 123
slug: /some/path
---
Content`);

    await expect(getAllDocFileIds('/output')).rejects.toThrow('missing "id" in frontmatter');
  });

  it('processes multiple files concurrently', async () => {
    const files = Array.from({ length: 25 }, (_, i) => `/output/plugin_${i}.mdx`);
    mockGlobby.mockResolvedValue(files);

    mockFsp.readFile.mockImplementation(async (filePath) => {
      const match = (filePath as string).match(/plugin_(\d+)/);
      const num = match ? match[1] : '0';
      return `---
id: kibPlugin${num}PluginApi
slug: /path
---
Content`;
    });

    const ids = await getAllDocFileIds('/output');

    expect(ids).toHaveLength(25);
    expect(ids).toContain('kibPlugin0PluginApi');
    expect(ids).toContain('kibPlugin24PluginApi');
  });

  it('handles frontmatter with extra fields', async () => {
    mockGlobby.mockResolvedValue(['/output/plugin.mdx']);
    mockFsp.readFile.mockResolvedValue(`---
id: kibTestPluginApi
slug: /kibana-dev-docs/api/test
title: "Test Plugin"
description: A test plugin description
date: 2025-01-01
tags: ['contributor', 'dev', 'apidocs']
image: https://example.com/image.png
---
Content here`);

    const ids = await getAllDocFileIds('/output');

    expect(ids).toEqual(['kibTestPluginApi']);
  });
});
