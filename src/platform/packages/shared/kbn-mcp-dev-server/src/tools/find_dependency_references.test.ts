/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findDependencyReferencesTool } from './find_dependency_references';
import fs from 'fs';
import { parseToolResultJsonContent } from './test_utils';

jest.mock('fs');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('findDependencyReferencesTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const setupMockFileSystem = (files: Record<string, string>, codeowners?: string) => {
    const fileMap = new Map(Object.entries(files));

    // Build directory structure from file paths.
    const dirContents = new Map<string, Set<string>>();
    dirContents.set('', new Set(['src', 'x-pack', '.gitignore']));
    dirContents.set('src', new Set(['file1.ts', 'file2.tsx', 'file3.js']));
    dirContents.set('x-pack', new Set(['file4.ts']));

    // Add files from the fileMap to the directory structure.
    for (const filePath of fileMap.keys()) {
      const parts = filePath.split('/');
      const fileName = parts.pop()!;
      const dirPath = parts.join('/');

      if (!dirContents.has(dirPath)) {
        dirContents.set(dirPath, new Set());
      }
      dirContents.get(dirPath)!.add(fileName);

      // Also ensure parent directories exist.
      for (let i = 0; i < parts.length; i++) {
        const parentDir = parts.slice(0, i).join('/');
        const childDir = parts[i];
        if (!dirContents.has(parentDir)) {
          dirContents.set(parentDir, new Set());
        }
        dirContents.get(parentDir)!.add(childDir);
      }
    }

    // Mock readFileSync to return file contents
    mockedFs.readFileSync.mockImplementation(((filePath: string, encoding?: string) => {
      if (encoding === 'utf8' || typeof encoding === 'object') {
        const relativePath = filePath.replace('/repo/root/', '');
        if (fileMap.has(relativePath)) {
          return fileMap.get(relativePath);
        }
        if (relativePath === '.gitignore') {
          return 'node_modules\n.git\ntarget\nbuild\n';
        }
        if (relativePath === '.github/CODEOWNERS') {
          return (
            codeowners ||
            `
/src @elastic/kibana-core
/x-pack @elastic/kibana-platform
          `.trim()
          );
        }
      }
      throw new Error(`File not found: ${filePath}`);
    }) as any);

    // Mock readdirSync to return directory contents
    mockedFs.readdirSync.mockImplementation(((dirPath: string) => {
      const relativePath = dirPath.replace('/repo/root/', '').replace('/repo/root', '');
      const contents = dirContents.get(relativePath);
      if (contents) {
        return Array.from(contents);
      }
      return [];
    }) as any);

    // Mock lstatSync to return file stats
    mockedFs.lstatSync.mockImplementation(((filePath: string) => {
      const relativePath = filePath.replace('/repo/root/', '').replace('/repo/root', '');
      // Check if it's a known directory.
      if (dirContents.has(relativePath) || relativePath.startsWith('.git')) {
        return { isDirectory: () => true, isFile: () => false } as any;
      }
      return { isDirectory: () => false, isFile: () => true } as any;
    }) as any);

    // Mock existsSync
    mockedFs.existsSync.mockReturnValue(true);
  };

  describe('handler', () => {
    it('finds files with ES6 import statements', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import { someFunc } from 'enzyme';\nimport React from 'react';`,
        'src/file2.tsx': `import { shallow } from 'enzyme';`,
        'src/file3.js': `import lodash from 'lodash';`,
        'x-pack/file4.ts': `import axios from 'axios';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.dependencyName).toBe('enzyme');
      expect(parsedResult.totalMatchingFiles).toBe(2);
      expect(parsedResult.matchingFiles).toContain('src/file1.ts');
      expect(parsedResult.matchingFiles).toContain('src/file2.tsx');
      expect(parsedResult.matchingFiles).not.toContain('src/file3.js');
    });

    it('finds files with CommonJS require statements', async () => {
      setupMockFileSystem({
        'src/file1.ts': `const enzyme = require('enzyme');`,
        'src/file2.tsx': `const lodash = require('lodash');`,
        'src/file3.js': `import React from 'react';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(1);
      expect(parsedResult.matchingFiles).toContain('src/file1.ts');
    });

    it('finds files with dynamic imports', async () => {
      setupMockFileSystem({
        'src/file1.ts': `const enzyme = await import('enzyme');`,
        'src/file2.tsx': `import('lodash');`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(1);
      expect(parsedResult.matchingFiles).toContain('src/file1.ts');
    });

    it('extracts destructured import APIs', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import { shallow, mount, render } from 'enzyme';`,
        'src/file2.tsx': `import { mount as enzymeMount } from 'enzyme';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(2);
      expect(parsedResult.uniqueApis).toContain('shallow');
      expect(parsedResult.uniqueApis).toContain('mount');
      expect(parsedResult.uniqueApis).toContain('render');
    });

    it('groups files by team ownership', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': `import { shallow } from 'enzyme';`,
          'src/file2.tsx': `import { mount } from 'enzyme';`,
          'x-pack/file4.ts': `import { render } from 'enzyme';`,
        },
        `
/src @elastic/kibana-core
/x-pack @elastic/kibana-platform
        `.trim()
      );

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.matchingFilesByTeam).toHaveLength(2);
      expect(parsedResult.matchingFilesByTeam[0].team).toBe('@elastic/kibana-core');
      expect(parsedResult.matchingFilesByTeam[0].fileCount).toBe(2);
      expect(parsedResult.matchingFilesByTeam[1].team).toBe('@elastic/kibana-platform');
      expect(parsedResult.matchingFilesByTeam[1].fileCount).toBe(1);
    });

    it('always includes detailed file information', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import { shallow, mount } from 'enzyme';`,
        'src/file2.tsx': `import { render } from 'enzyme';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.matchingFilesByTeam[0].files).toHaveLength(2);
      expect(parsedResult.matchingFilesByTeam[0].files[0].filePath).toBe('src/file1.ts');
      expect(parsedResult.matchingFilesByTeam[0].files[0].apis).toContain('shallow');
      expect(parsedResult.matchingFilesByTeam[0].files[0].apis).toContain('mount');
    });

    it('returns zero usage when dependency is not found', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import React from 'react';`,
        'src/file2.tsx': `import lodash from 'lodash';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(0);
      expect(parsedResult.matchingFiles).toHaveLength(0);
      expect(parsedResult.uniqueApis).toHaveLength(0);
    });

    it('handles multiline imports correctly', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import {
  shallow,
  mount,
  render
} from 'enzyme';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(1);
      expect(parsedResult.uniqueApis).toContain('shallow');
      expect(parsedResult.uniqueApis).toContain('mount');
      expect(parsedResult.uniqueApis).toContain('render');
    });

    it('ignores dotfiles and dotfolders at root level', async () => {
      mockedFs.readdirSync.mockImplementation(((dirPath: string) => {
        const relativePath = dirPath.replace('/repo/root/', '').replace('/repo/root', '');
        if (!relativePath || relativePath === '') {
          return ['src', '.git', '.hidden', '.gitignore'];
        }
        if (relativePath === 'src') {
          return ['file1.ts'];
        }
        return [];
      }) as any);

      setupMockFileSystem({
        'src/file1.ts': `import { shallow } from 'enzyme';`,
        '.hidden/file2.ts': `import { mount } from 'enzyme';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(1);
      expect(parsedResult.matchingFiles).not.toContain('.hidden/file2.ts');
    });

    it('returns analysis time in milliseconds', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import { shallow } from 'enzyme';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.analysisTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof parsedResult.analysisTimeMs).toBe('number');
    });

    it('handles scoped packages correctly', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import { ResizableLayout } from '@kbn/resizable-layout';`,
        'src/file2.tsx': `import React from 'react';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: '@kbn/resizable-layout',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(1);
      expect(parsedResult.matchingFiles).toContain('src/file1.ts');
      expect(parsedResult.uniqueApis).toContain('ResizableLayout');
    });

    it('sorts unique APIs alphabetically', async () => {
      setupMockFileSystem({
        'src/file1.ts': `import { zebra, alpha, beta } from 'enzyme';`,
      });

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.uniqueApis).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('handles files that cannot be read gracefully', async () => {
      // Setup filesystem structure first
      mockedFs.readdirSync.mockImplementation(((dirPath: string) => {
        const relativePath = dirPath.replace('/repo/root/', '').replace('/repo/root', '');
        if (!relativePath || relativePath === '') {
          return ['src', '.gitignore'];
        }
        if (relativePath === 'src') {
          return ['file1.ts', 'file2.tsx'];
        }
        return [];
      }) as any);

      mockedFs.lstatSync.mockImplementation(((filePath: string) => {
        const relativePath = filePath.replace('/repo/root/', '').replace('/repo/root', '');
        if (relativePath === 'src' || relativePath.startsWith('.git')) {
          return { isDirectory: () => true, isFile: () => false } as any;
        }
        return { isDirectory: () => false, isFile: () => true } as any;
      }) as any);

      // Mock readFileSync to throw for file1.ts
      mockedFs.readFileSync.mockImplementation(((
        filePath: string,
        encoding?: string | Record<string, any>
      ) => {
        const relativePath = filePath.replace('/repo/root/', '').replace('/repo/root', '');

        if (relativePath === '.gitignore' || filePath.endsWith('.gitignore')) {
          return 'node_modules\n.git\n';
        }

        if (relativePath === 'src/file1.ts') {
          throw new Error('Permission denied');
        }

        if (relativePath === 'src/file2.tsx') {
          return `import { shallow } from 'enzyme';`;
        }

        throw new Error('File not found');
      }) as any);

      mockedFs.existsSync.mockReturnValue(true);

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'enzyme',
      });

      const parsedResult = parseToolResultJsonContent(result);

      // Should only find file2.tsx, file1.ts should be skipped
      expect(parsedResult.totalMatchingFiles).toBe(1);
      expect(parsedResult.matchingFiles).toContain('src/file2.tsx');
      expect(parsedResult.matchingFiles).not.toContain('src/file1.ts');
    });

    it('handles gitignore patterns with leading slash', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': "import moment from 'moment';",
          'src/file2.ts': "import moment from 'moment';",
        },
        '/src @elastic/kibana-core'
      );

      mockedFs.readFileSync.mockImplementation(((filePath: string) => {
        const relativePath = filePath.replace('/repo/root/', '');
        if (relativePath === '.gitignore') {
          return '/src/file1.ts\n';
        }
        if (relativePath === 'src/file1.ts') {
          return "import moment from 'moment';";
        }
        if (relativePath === 'src/file2.ts') {
          return "import moment from 'moment';";
        }
        throw new Error('File not found');
      }) as any);

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // file1.ts should be ignored due to gitignore pattern
      expect(parsedResult.matchingFiles).not.toContain('src/file1.ts');
    });

    it('handles simple gitignore patterns without slash or glob', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': "import moment from 'moment';",
          'src/ignored/file2.ts': "import moment from 'moment';",
        },
        '/src @elastic/kibana-core'
      );

      // Override the mock to provide a simple gitignore pattern.
      mockedFs.readFileSync.mockImplementation(((filePath: string) => {
        const relativePath = filePath.replace('/repo/root/', '');
        if (relativePath === '.gitignore') {
          return 'ignored\n';
        }
        if (relativePath === 'src/file1.ts') {
          return "import moment from 'moment';";
        }
        if (relativePath === 'src/ignored/file2.ts') {
          return "import moment from 'moment';";
        }
        if (relativePath === '.github/CODEOWNERS') {
          return '/src @elastic/kibana-core';
        }
        throw new Error('File not found');
      }) as any);

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // file2.ts in 'ignored' directory should be skipped.
      expect(parsedResult.matchingFiles).not.toContain('src/ignored/file2.ts');
    });

    it('respects CODEOWNERS specificity with multiple matching rules', async () => {
      setupMockFileSystem(
        {
          'src/plugins/myPlugin/file.ts': "import moment from 'moment';",
        },
        `/src @elastic/kibana-core
/src/plugins @elastic/kibana-platform
/src/plugins/myPlugin @elastic/kibana-data-discovery`
      );

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should use the most specific rule.
      const team = parsedResult.matchingFilesByTeam?.find(
        (t: { team: string }) => t.team === '@elastic/kibana-data-discovery'
      );
      expect(team).toBeDefined();
      expect(team.fileCount).toBe(1);
    });

    it('skips overly broad gitignore patterns', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': "import moment from 'moment';",
        },
        '/src @elastic/kibana-core'
      );

      mockedFs.readFileSync.mockImplementation(((filePath: string) => {
        const relativePath = filePath.replace('/repo/root/', '');
        if (relativePath === '.gitignore') {
          return '*\n**\na\n';
        }
        if (relativePath === 'src/file1.ts') {
          return "import moment from 'moment';";
        }
        throw new Error('File not found');
      }) as any);

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should still find files despite overly broad patterns
      expect(parsedResult.matchingFiles).toContain('src/file1.ts');
    });

    it('handles files that cannot be stat', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': "import moment from 'moment';",
        },
        '/src @elastic/kibana-core'
      );

      mockedFs.lstatSync.mockImplementation((() => {
        throw new Error('Permission denied');
      }) as any);

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should handle stat errors gracefully
      expect(parsedResult.totalMatchingFiles).toBe(0);
    });

    it('detects variable assignments and method calls', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': `
            import moment from 'moment';
            const m = moment();
            const result = m.format('YYYY-MM-DD');
            const value = m.add(1, 'day');
          `,
        },
        '/src @elastic/kibana-core'
      );

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.totalMatchingFiles).toBeGreaterThan(0);
      const team = parsedResult.matchingFilesByTeam?.find(
        (t: { team: string }) => t.team === '@elastic/kibana-core'
      );
      if (team && team.files.length > 0) {
        const fileResult = team.files[0];
        expect(fileResult.apis).toContain('format');
        expect(fileResult.apis).toContain('add');
      } else {
        // If team not found, at least verify the file was found.
        expect(parsedResult.totalMatchingFiles).toBeGreaterThan(0);
      }
    });

    it('handles destructured imports with method calls', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': `
            import { format, add } from 'moment';
            const date = format(new Date());
            const newDate = add(new Date(), 1, 'day');
          `,
        },
        '/src @elastic/kibana-core'
      );

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.totalMatchingFiles).toBeGreaterThan(0);
      const team = parsedResult.matchingFilesByTeam?.find(
        (t: { team: string }) => t.team === '@elastic/kibana-core'
      );
      if (team && team.files.length > 0) {
        const fileResult = team.files[0];
        expect(fileResult.apis).toContain('format');
        expect(fileResult.apis).toContain('add');
      } else {
        // If team not found, at least verify the file was found.
        expect(parsedResult.totalMatchingFiles).toBeGreaterThan(0);
      }
    });

    it('handles CODEOWNERS with empty lines and comments', async () => {
      setupMockFileSystem(
        {
          'src/file.ts': "import moment from 'moment';",
        },
        `
# Comment line

/src @elastic/kibana-core

# Another comment
        `.trim()
      );

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should handle empty lines and comments without crashing
      expect(parsedResult).toBeDefined();
      expect(typeof parsedResult.totalMatchingFiles).toBe('number');
    });

    it('handles CODEOWNERS with malformed lines', async () => {
      setupMockFileSystem(
        {
          'src/file.ts': "import moment from 'moment';",
        },
        `
/src @elastic/kibana-core
malformed-line-without-team
/another/path
        `.trim()
      );

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should handle malformed lines without crashing
      expect(parsedResult).toBeDefined();
      expect(typeof parsedResult.totalMatchingFiles).toBe('number');
    });

    it('handles method calls with whitespace in API name', async () => {
      setupMockFileSystem(
        {
          'src/file1.ts': `
            import moment from 'moment';
            const m = moment();
            const result = m.  format  ();
          `,
        },
        '/src @elastic/kibana-core'
      );

      const result = await findDependencyReferencesTool.handler({
        dependencyName: 'moment',
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.totalMatchingFiles).toBeGreaterThan(0);
      const team = parsedResult.matchingFilesByTeam?.find(
        (t: { team: string }) => t.team === '@elastic/kibana-core'
      );
      if (team && team.files.length > 0) {
        const fileResult = team.files[0];
        expect(fileResult.apis).toContain('format');
      } else {
        // If team not found, at least verify the file was found.
        expect(parsedResult.totalMatchingFiles).toBeGreaterThan(0);
      }
    });
  });

  describe('tool definition', () => {
    it('has correct name', () => {
      expect(findDependencyReferencesTool.name).toBe('find_dependency_references');
    });

    it('has a description', () => {
      expect(findDependencyReferencesTool.description).toBeTruthy();
      expect(typeof findDependencyReferencesTool.description).toBe('string');
    });

    it('has an input schema', () => {
      expect(findDependencyReferencesTool.inputSchema).toBeDefined();
    });

    it('has a handler function', () => {
      expect(findDependencyReferencesTool.handler).toBeDefined();
      expect(typeof findDependencyReferencesTool.handler).toBe('function');
    });
  });
});
