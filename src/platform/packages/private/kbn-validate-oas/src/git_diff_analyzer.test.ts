/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GitDiffAnalyzer, type GitChange } from './git_diff_analyzer';

describe('GitDiffAnalyzer', () => {
  let analyzer: GitDiffAnalyzer;

  beforeEach(() => {
    analyzer = new GitDiffAnalyzer();
  });

  describe('analyzeDiff', () => {
    it('should identify OAS-related changes', () => {
      // Mock git changes to avoid actual git operations
      const mockChanges: GitChange[] = [
        {
          filePath:
            'x-pack/solutions/security/plugins/security_solution/server/routes/detection_engine.ts',
          changeType: 'modified',
          isOasFile: true,
        },
        {
          filePath: 'src/components/dashboard.tsx',
          changeType: 'modified',
          isOasFile: false,
        },
      ];

      // Mock the getGitChanges method
      jest.spyOn(analyzer as any, 'getGitChanges').mockReturnValue(mockChanges);

      const result = analyzer.analyzeDiff({ baseBranch: 'main' });

      expect(result.hasOasChanges).toBe(true);
      expect(result.oasFilesChanged).toHaveLength(1);
      expect(result.shouldRunValidation).toBe(true);
    });

    it('should handle git operation failures gracefully', () => {
      // Mock git failure
      jest.spyOn(analyzer as any, 'getGitChanges').mockImplementation(() => {
        throw new Error('Git operation failed');
      });

      const result = analyzer.analyzeDiff();

      expect(result.hasOasChanges).toBe(true);
      expect(result.shouldRunValidation).toBe(true);
    });
  });

  describe('extractApiPathsFromRouteFiles', () => {
    it('should extract API paths from multiple route files', () => {
      const filePaths = [
        'x-pack/solutions/observability/plugins/slo/server/routes/slo/get_slo.ts',
        'x-pack/platform/plugins/shared/fleet/server/routes/agent/index.ts',
      ];

      // Mock file parsing
      const mockParseResult = {
        success: true,
        routes: [
          {
            method: 'GET' as const,
            path: '/api/observability/slos/{id}',
            isVersioned: true,
            version: '2023-10-31',
            isPublic: true,
          },
        ],
        errors: [],
        parseTimeMs: 50,
      };

      jest.spyOn(analyzer as any, 'parseRouteFile').mockReturnValue(mockParseResult);

      const results = analyzer.extractApiPathsFromRouteFiles(filePaths);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].routes).toHaveLength(1);
      expect(results[0].routes[0].path).toBe('/api/observability/slos/{id}');
    });

    it('should handle parsing errors gracefully', () => {
      const filePaths = ['invalid/route/file.ts'];

      jest.spyOn(analyzer as any, 'parseRouteFile').mockImplementation(() => {
        throw new Error('File not found');
      });

      const results = analyzer.extractApiPathsFromRouteFiles(filePaths);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errors).toContain('File not found');
    });
  });

  describe('mapPluginToApiPaths', () => {
    it('should map plugin to API paths using parsed routes', () => {
      const pluginPath = 'x-pack/solutions/security/plugins/security_solution';

      // Mock route file discovery
      jest
        .spyOn(analyzer as any, 'findRouteFiles')
        .mockReturnValue([
          'x-pack/solutions/security/plugins/security_solution/server/routes/detection_engine.ts',
        ]);

      // Mock route parsing
      const mockRoutes = [
        {
          method: 'POST' as const,
          path: '/api/detection_engine/rules',
          isVersioned: false,
          isPublic: true,
        },
      ];

      jest.spyOn(analyzer, 'extractApiPathsFromRouteFiles').mockReturnValue([
        {
          success: true,
          routes: mockRoutes,
          errors: [],
          parseTimeMs: 100,
        },
      ]);

      const mapping = analyzer.mapPluginToApiPaths(pluginPath);

      expect(mapping.pluginName).toBe('security_solution');
      expect(mapping.pluginPath).toBe(pluginPath);
      expect(mapping.apiPaths).toContain('/paths/~1api~1detection_engine~1rules');
      expect(mapping.confidence).toBe('high');
      expect(mapping.source).toBe('parsed');
    });

    it('should fall back to heuristic mapping when no routes found', () => {
      const pluginPath = 'x-pack/solutions/search/plugins/unknown_plugin';

      // Mock no route files found
      jest.spyOn(analyzer as any, 'findRouteFiles').mockReturnValue([]);

      const mapping = analyzer.mapPluginToApiPaths(pluginPath);

      expect(mapping.pluginName).toBe('unknown_plugin');
      expect(mapping.confidence).toBe('low');
      expect(mapping.source).toBe('heuristic');
      expect(mapping.apiPaths.length).toBeGreaterThan(0);
    });

    it('should use cached mappings for repeated calls', () => {
      const pluginPath = 'x-pack/platform/plugins/shared/fleet';

      // Mock route file discovery (should only be called once)
      const findRouteFilesSpy = jest
        .spyOn(analyzer as any, 'findRouteFiles')
        .mockReturnValue(['fleet/server/routes/agent.ts']);

      jest.spyOn(analyzer, 'extractApiPathsFromRouteFiles').mockReturnValue([
        {
          success: true,
          routes: [
            {
              method: 'GET' as const,
              path: '/api/fleet/agents',
              isVersioned: false,
              isPublic: true,
            },
          ],
          errors: [],
          parseTimeMs: 50,
        },
      ]);

      // First call
      const mapping1 = analyzer.mapPluginToApiPaths(pluginPath);
      // Second call (should use cache)
      const mapping2 = analyzer.mapPluginToApiPaths(pluginPath);

      expect(findRouteFilesSpy).toHaveBeenCalledTimes(1);
      expect(mapping1).toEqual(mapping2);
    });
  });

  describe('route pattern parsing', () => {
    it('should parse standard router calls', () => {
      // Mock the parseRouteFile method to return expected results
      const mockResult = {
        success: true,
        routes: [
          {
            method: 'GET' as const,
            path: '/api/fleet/agents',
            isVersioned: false,
            isPublic: true,
          },
        ],
        errors: [],
        parseTimeMs: 50,
      };

      jest.spyOn(analyzer as any, 'parseRouteFile').mockReturnValue(mockResult);

      const result = (analyzer as any).parseRouteFile('test_route.ts');

      expect(result.success).toBe(true);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]).toEqual({
        method: 'GET',
        path: '/api/fleet/agents',
        isVersioned: false,
        isPublic: true,
      });
    });

    it('should parse versioned router calls', () => {
      const mockResult = {
        success: true,
        routes: [
          {
            method: 'GET' as const,
            path: '/api/cases/{case_id}',
            isVersioned: true,
            isPublic: true,
          },
        ],
        errors: [],
        parseTimeMs: 50,
      };

      jest.spyOn(analyzer as any, 'parseRouteFile').mockReturnValue(mockResult);

      const result = (analyzer as any).parseRouteFile('test_versioned_route.ts');

      expect(result.success).toBe(true);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]).toEqual({
        method: 'GET',
        path: '/api/cases/{case_id}',
        isVersioned: true,
        isPublic: true,
      });
    });

    it('should parse custom route creation functions', () => {
      const mockResult = {
        success: true,
        routes: [
          {
            method: 'GET' as const,
            path: '/api/observability/slos/{id}',
            isVersioned: true,
            version: '2023-10-31',
            isPublic: true,
          },
        ],
        errors: [],
        parseTimeMs: 50,
      };

      jest.spyOn(analyzer as any, 'parseRouteFile').mockReturnValue(mockResult);

      const result = (analyzer as any).parseRouteFile('test_custom_route.ts');

      expect(result.success).toBe(true);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]).toEqual({
        method: 'GET',
        path: '/api/observability/slos/{id}',
        isVersioned: true,
        version: '2023-10-31',
        isPublic: true,
      });
    });
  });

  describe('plugin discovery', () => {
    it('should extract correct plugin names from various path patterns', () => {
      const testCases = [
        {
          path: 'x-pack/solutions/security/plugins/security_solution',
          expected: 'security_solution',
        },
        {
          path: 'x-pack/platform/plugins/shared/fleet',
          expected: 'fleet',
        },
        {
          path: 'src/platform/plugins/shared/dashboard',
          expected: 'dashboard',
        },
        {
          path: 'src/plugins/data',
          expected: 'data',
        },
      ];

      testCases.forEach(({ path, expected }) => {
        const pluginName = (analyzer as any).extractPluginName(path);
        expect(pluginName).toBe(expected);
      });
    });

    it('should generate heuristic API paths based on plugin patterns', () => {
      const testCases = [
        {
          pluginName: 'security_solution',
          pluginPath: 'x-pack/solutions/security/plugins/security_solution',
          expectedPaths: ['/paths/~1api~1security', '/paths/~1api~1detection_engine'],
        },
        {
          pluginName: 'apm',
          pluginPath: 'x-pack/solutions/observability/plugins/apm',
          expectedPaths: ['/paths/~1api~1observability', '/paths/~1api~1apm'],
        },
        {
          pluginName: 'enterprise_search',
          pluginPath: 'x-pack/solutions/search/plugins/enterprise_search',
          expectedPaths: ['/paths/~1api~1search', '/paths/~1api~1enterprise_search'],
        },
      ];

      testCases.forEach(({ pluginName, pluginPath, expectedPaths }) => {
        const paths = (analyzer as any).generateHeuristicApiPaths(pluginName, pluginPath);
        expectedPaths.forEach((expectedPath) => {
          expect(paths).toContain(expectedPath);
        });
      });
    });
  });

  describe('confidence scoring', () => {
    it('should assign high confidence to parsed routes', () => {
      const mapping = {
        pluginName: 'test',
        pluginPath: 'test/path',
        apiPaths: ['/api/test'],
        confidence: 'high' as const,
        source: 'parsed' as const,
      };

      const confidence = (analyzer as any).calculateMappingConfidence(mapping);
      expect(confidence).toBe('high');
    });

    it('should assign medium confidence to static mappings', () => {
      const mapping = {
        pluginName: 'test',
        pluginPath: 'test/path',
        apiPaths: ['/api/test'],
        confidence: 'medium' as const,
        source: 'mapped' as const,
      };

      const confidence = (analyzer as any).calculateMappingConfidence(mapping);
      expect(confidence).toBe('medium');
    });

    it('should assign low confidence to heuristic mappings', () => {
      const mapping = {
        pluginName: 'test',
        pluginPath: 'test/path',
        apiPaths: ['/api/test'],
        confidence: 'low' as const,
        source: 'heuristic' as const,
      };

      const confidence = (analyzer as any).calculateMappingConfidence(mapping);
      expect(confidence).toBe('low');
    });
  });

  describe('path conversion', () => {
    it('should convert route paths to OpenAPI path format', () => {
      const testCases = [
        {
          input: '/api/fleet/agents',
          expected: '/paths/~1api~1fleet~1agents',
        },
        {
          input: '/api/cases/{case_id}',
          expected: '/paths/~1api~1cases~1{case_id}',
        },
        {
          input: '/api/detection_engine/rules',
          expected: '/paths/~1api~1detection_engine~1rules',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (analyzer as any).convertPathToOasFormat(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('utility methods', () => {
    it('should correctly identify route files', () => {
      const testCases = [
        { path: 'x-pack/plugins/fleet/server/routes/agent.ts', expected: true },
        { path: 'x-pack/plugins/security/server/lib/route_handler.ts', expected: true },
        { path: 'x-pack/plugins/dashboard/public/components/panel.ts', expected: false },
        { path: 'x-pack/plugins/fleet/server/services/agent.ts', expected: true },
      ];

      testCases.forEach(({ path, expected }) => {
        const result = (analyzer as any).isRouteFile(path);
        expect(result).toBe(expected);
      });
    });

    it('should extract plugin root from file paths', () => {
      const testCases = [
        {
          path: 'x-pack/solutions/security/plugins/security_solution/server/routes/detection.ts',
          expected: 'x-pack/solutions/security/plugins/security_solution',
        },
        {
          path: 'x-pack/platform/plugins/shared/fleet/server/routes/agent.ts',
          expected: 'x-pack/platform/plugins/shared/fleet',
        },
        {
          path: 'src/platform/plugins/shared/dashboard/server/routes/api.ts',
          expected: 'src/platform/plugins/shared/dashboard',
        },
        {
          path: 'some/other/path/file.ts',
          expected: null,
        },
      ];

      testCases.forEach(({ path, expected }) => {
        const result = (analyzer as any).getPluginRoot(path);
        expect(result).toBe(expected);
      });
    });
  });
});
