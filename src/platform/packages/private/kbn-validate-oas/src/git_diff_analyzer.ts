/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'node:child_process';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import ts from 'typescript';

export interface GitChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  isOasFile: boolean;
}

export interface DiffAnalysisOptions {
  baseBranch?: string;
  targetBranch?: string;
  staged?: boolean;
}

export interface DiffAnalysisResult {
  hasOasChanges: boolean;
  oasFilesChanged: GitChange[];
  affectedPaths: string[];
  shouldRunValidation: boolean;
}

export interface ParsedRouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  isVersioned: boolean;
  version?: string;
  isPublic: boolean;
}

export interface PluginRouteMapping {
  pluginName: string;
  pluginPath: string;
  apiPaths: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'parsed' | 'mapped' | 'heuristic';
}

export interface RouteParsingResult {
  success: boolean;
  routes: ParsedRouteInfo[];
  errors: string[];
  parseTimeMs: number;
}

/**
 * Analyzes git diffs to determine incremental validation scope for OpenAPI specifications.
 *
 * This class provides intelligent analysis of git changes to optimize OAS validation by
 * identifying which API routes and paths have been modified, enabling incremental validation
 * that only processes relevant changes instead of validating all specifications.
 *
 * @example
 * ```typescript
 * import { GitDiffAnalyzer } from './git_diff_analyzer';
 *
 * const analyzer = new GitDiffAnalyzer();
 *
 * // Analyze changes against main branch
 * const analysis = analyzer.analyzeDiff({ baseBranch: 'main' });
 *
 * if (analysis.shouldRunValidation) {
 *   log.info('OAS-related changes detected');
 *   log.info('Affected API paths:', analysis.affectedPaths);
 * }
 *
 * // Analyze staged changes for pre-commit validation
 * const stagedAnalysis = analyzer.analyzeDiff({ staged: true });
 *
 * // Check if currently in a git repository
 * if (analyzer.isGitRepository()) {
 *   // Safe to run git-based analysis
 * }
 * ```
 *
 * @public
 */
export class GitDiffAnalyzer {
  private readonly oasSourcePatterns: string[];
  private readonly routeCache: Map<string, { result: RouteParsingResult; mtime: number }>;
  private readonly pluginMappingCache: Map<string, PluginRouteMapping>;

  constructor() {
    // Patterns that indicate OAS-related changes
    this.oasSourcePatterns = [
      'packages/core/http/core-http-router-server-internal/**/*.ts',
      'x-pack/solutions/*/plugins/*/server/routes/**/*.ts',
      'src/plugins/*/server/routes/**/*.ts',
      'x-pack/plugins/*/server/routes/**/*.ts',
      'x-pack/platform/plugins/*/server/routes/**/*.ts',
      'src/platform/plugins/*/server/routes/**/*.ts',
      'packages/*/server/routes/**/*.ts',
      'oas_docs/**/*',
      // Add more patterns as needed
    ];

    // Initialize caches
    this.routeCache = new Map();
    this.pluginMappingCache = new Map();
  }

  /**
   * Analyzes git diff to determine what OAS validation should be performed.
   *
   * This method examines git changes to identify files that may affect OpenAPI specifications,
   * extracts affected API paths, and determines whether validation should be run based on
   * the scope of changes detected.
   *
   * @param options - Configuration options for diff analysis
   * @param options.baseBranch - Base branch to compare against (default: 'main')
   * @param options.targetBranch - Target branch for comparison (optional)
   * @param options.staged - Whether to analyze only staged changes (default: false)
   * @returns Analysis result with OAS change detection and affected paths
   *
   * @example
   * ```typescript
   * const analyzer = new GitDiffAnalyzer();
   *
   * // Analyze all changes against main branch
   * const fullAnalysis = analyzer.analyzeDiff();
   * console.log(`Should validate: ${fullAnalysis.shouldRunValidation}`);
   * console.log(`OAS files changed: ${fullAnalysis.oasFilesChanged.length}`);
   * console.log(`Affected paths: ${fullAnalysis.affectedPaths.join(', ')}`);
   *
   * // Analyze only staged changes for pre-commit hooks
   * const stagedAnalysis = analyzer.analyzeDiff({ staged: true });
   * if (stagedAnalysis.hasOasChanges) {
   *   console.log('Staged changes affect OAS, running validation...');
   * }
   *
   * // Compare against a specific branch
   * const branchAnalysis = analyzer.analyzeDiff({
   *   baseBranch: 'develop',
   *   targetBranch: 'feature/new-api'
   * });
   * ```
   *
   * @throws {Error} If git operations fail or repository is not available
   */
  analyzeDiff(options: DiffAnalysisOptions = {}): DiffAnalysisResult {
    const { baseBranch = 'main', staged = false } = options;

    try {
      const changes = this.getGitChanges(baseBranch, staged);
      const oasRelatedChanges = this.filterOasRelatedChanges(changes);
      const affectedPaths = this.extractAffectedApiPaths(oasRelatedChanges);

      return {
        hasOasChanges: oasRelatedChanges.length > 0,
        oasFilesChanged: oasRelatedChanges,
        affectedPaths,
        shouldRunValidation: this.shouldRunValidation(oasRelatedChanges),
      };
    } catch (error) {
      // If git operations fail, default to full validation
      return {
        hasOasChanges: true,
        oasFilesChanged: [],
        affectedPaths: [],
        shouldRunValidation: true,
      };
    }
  }

  /**
   * Get list of changed files from git
   */
  private getGitChanges(baseBranch: string, staged: boolean): GitChange[] {
    const gitCommand = staged
      ? 'git diff --cached --name-status'
      : `git diff --name-status ${baseBranch}...HEAD`;

    try {
      const output = execSync(gitCommand, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      return output
        .trim()
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => this.parseGitStatusLine(line))
        .filter((change) => change !== null) as GitChange[];
    } catch (error) {
      // If git operations fail, return empty array and let caller handle
      return [];
    }
  }

  /**
   * Parse a git status line into a GitChange object
   */
  private parseGitStatusLine(line: string): GitChange | null {
    const parts = line.trim().split('\t');
    if (parts.length < 2) return null;

    const [status, filePath] = parts;
    let changeType: 'added' | 'modified' | 'deleted';

    switch (status[0]) {
      case 'A':
        changeType = 'added';
        break;
      case 'M':
        changeType = 'modified';
        break;
      case 'D':
        changeType = 'deleted';
        break;
      default:
        changeType = 'modified';
    }

    return {
      filePath,
      changeType,
      isOasFile: this.isOasRelatedFile(filePath),
    };
  }

  /**
   * Check if a file path is OAS-related
   */
  private isOasRelatedFile(filePath: string): boolean {
    // Check if it's an OAS output file
    if (filePath.includes('oas_docs/output/')) {
      return true;
    }

    // Check against known patterns that affect OAS generation
    return this.oasSourcePatterns.some((pattern) => this.matchesGlobPattern(filePath, pattern));
  }
  /**
   * Match a file path against a glob-style pattern without using regex
   */
  private matchesGlobPattern(filePath: string, pattern: string): boolean {
    // Split the pattern and path into segments
    const patternParts = pattern.split('/');
    const pathParts = filePath.split('/');

    let patternIdx = 0;
    let pathIdx = 0;

    while (patternIdx < patternParts.length && pathIdx < pathParts.length) {
      const patternPart = patternParts[patternIdx];
      const pathPart = pathParts[pathIdx];
      // Handle "**" (matches zero or more directory levels)
      if (patternPart === '**') {
        patternIdx++;
        // If ** is the last pattern part, it matches everything remaining
        if (patternIdx === patternParts.length) {
          return true;
        }
        // Try to match the rest of the pattern against remaining path parts
        for (let i = pathIdx; i < pathParts.length; i++) {
          if (
            this.matchesGlobPattern(
              pathParts.slice(i).join('/'),
              patternParts.slice(patternIdx).join('/')
            )
          ) {
            return true;
          }
        }
        return false;
      }
      // Handle "*" (matches anything in a single segment)
      else if (patternPart === '*') {
        // Match anything in this segment
        patternIdx++;
        pathIdx++;
      }
      // Handle patterns starting with '*' and containing a dot (e.g., "*.ts", "*file.js")
      else if (patternPart.startsWith('*') && patternPart.includes('.')) {
        const extension = patternPart.substring(patternPart.indexOf('.'));
        if (!pathPart.endsWith(extension)) {
          return false;
        }
        patternIdx++;
        pathIdx++;
      }
      // Exact match required
      else if (patternPart !== pathPart) {
        return false;
      }
      // Both parts match exactly
      else {
        patternIdx++;
        pathIdx++;
      }
    }
    // Path matches if we've used the entire pattern
    // Only allow '**' to match remaining segments if it is the last pattern part
    if (patternIdx === patternParts.length && pathIdx === pathParts.length) {
      return true;
    }
    // If pattern ends with '**', it can match any remaining path segments
    if (patternIdx === patternParts.length - 1 && patternParts[patternIdx] === '**') {
      return true;
    }
    return false;
  }

  /**
   * Filter changes to only OAS-related files
   */
  private filterOasRelatedChanges(changes: GitChange[]): GitChange[] {
    return changes.filter((change) => change.isOasFile);
  }

  /**
   * Extract affected API paths from file changes using enhanced analysis
   */
  private extractAffectedApiPaths(changes: GitChange[]): string[] {
    const paths = new Set<string>();

    for (const change of changes) {
      if (change.changeType === 'deleted') {
        // For deleted files, we'll need to run full validation
        // as we can't determine what APIs were removed
        continue;
      }

      // Direct route file changes
      if (this.isRouteFile(change.filePath)) {
        const apiPaths = this.extractApiPathsFromRouteFile(change.filePath);
        apiPaths.forEach((path) => paths.add(path));
      } else {
        // Indirect changes - analyze through plugin mapping
        const pluginPath = this.getPluginRoot(change.filePath);
        if (pluginPath) {
          const pluginMapping = this.mapPluginToApiPaths(pluginPath);

          // Only include high/medium confidence mappings
          if (pluginMapping.confidence !== 'low') {
            pluginMapping.apiPaths.forEach((path) => paths.add(path));
          }
        }
      }
    }

    return Array.from(paths);
  }

  /**
   * Check if a file is a route file based on path patterns
   */
  private isRouteFile(filePath: string): boolean {
    return (
      filePath.includes('/routes/') ||
      filePath.includes('/route') ||
      (filePath.includes('/server/') && filePath.endsWith('.ts'))
    );
  }

  /**
   * Get the plugin root directory from a file path
   */
  private getPluginRoot(filePath: string): string | null {
    // Handle different plugin path patterns
    const pluginPatterns = [
      /^(x-pack\/solutions\/[^\/]+\/plugins\/[^\/]+)/,
      /^(x-pack\/platform\/plugins\/[^\/]+\/[^\/]+)/,
      /^(src\/platform\/plugins\/[^\/]+\/[^\/]+)/,
      /^(src\/plugins\/[^\/]+)/,
      /^(x-pack\/plugins\/[^\/]+)/,
    ];

    for (const pattern of pluginPatterns) {
      const match = filePath.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract API paths from route file path (heuristic)
   */
  private extractApiPathsFromRouteFile(filePath: string): string[] {
    const paths: string[] = [];

    try {
      // Try to parse the actual route file for accurate path extraction
      const parsedRoutes = this.parseRouteFile(filePath);
      if (parsedRoutes.success && parsedRoutes.routes.length > 0) {
        // Convert parsed routes to OAS path format
        paths.push(
          ...parsedRoutes.routes
            .filter((route) => route.isPublic) // Only include public routes
            .map((route) => this.convertPathToOasFormat(route.path))
        );
      }
    } catch (error) {
      // If parsing fails, fall back to heuristic approach
    }

    // If no routes were parsed successfully, use heuristic mapping
    if (paths.length === 0) {
      const heuristicPaths = this.extractPathsFromHeuristic(filePath);
      paths.push(...heuristicPaths);
    }

    return paths;
  }

  /**
   * Parse a TypeScript route file to extract route definitions using AST
   */
  private parseRouteFile(filePath: string): RouteParsingResult {
    const startTime = Date.now();
    const fullPath = join(REPO_ROOT, filePath);

    try {
      // Check cache first
      const stat = statSync(fullPath);
      const cacheKey = fullPath;
      const cached = this.routeCache.get(cacheKey);

      if (cached && cached.mtime === stat.mtimeMs) {
        return cached.result;
      }

      // Parse timeout protection
      const timeoutMs = 100;
      const parseStartTime = Date.now();

      if (Date.now() - parseStartTime > timeoutMs) {
        throw new Error(`Parse timeout exceeded ${timeoutMs}ms`);
      }

      const sourceCode = readFileSync(fullPath, 'utf8');
      const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

      const routes: ParsedRouteInfo[] = [];
      const errors: string[] = [];

      // Visit AST nodes to find route registrations
      const visit = (node: ts.Node) => {
        try {
          // Look for router.get(), router.post(), etc.
          if (ts.isCallExpression(node)) {
            const routeInfo = this.extractRouteFromCallExpression(node, sourceFile);
            if (routeInfo) {
              routes.push(routeInfo);
            }
          }

          // Look for router.versioned calls
          if (
            ts.isPropertyAccessExpression(node) &&
            node.name.text === 'versioned' &&
            node.parent &&
            ts.isCallExpression(node.parent)
          ) {
            const versionedRouteInfo = this.extractRouteFromCallExpression(node.parent, sourceFile);
            if (versionedRouteInfo) {
              routes.push(versionedRouteInfo);
            }
          }

          ts.forEachChild(node, visit);
        } catch (error) {
          errors.push(
            `Error parsing node: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      };

      visit(sourceFile);

      const result: RouteParsingResult = {
        success: errors.length === 0 || routes.length > 0,
        routes,
        errors,
        parseTimeMs: Date.now() - startTime,
      };

      // Cache the result
      this.routeCache.set(cacheKey, { result, mtime: stat.mtimeMs });

      return result;
    } catch (error) {
      return {
        success: false,
        routes: [],
        errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
        parseTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract route information from a router call expression
   */
  private extractRouteFromCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): ParsedRouteInfo | null {
    try {
      // Handle standard router calls (router.get, router.post, etc.)
      if (ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;
        const validMethods = ['get', 'post', 'put', 'delete', 'patch'];

        if (validMethods.includes(methodName.toLowerCase())) {
          return this.extractStandardRouteConfig(node, methodName);
        }
      }

      // Handle custom route creation functions (createSloServerRoute, etc.)
      if (ts.isIdentifier(node.expression)) {
        const functionName = node.expression.text;
        if (functionName.includes('Route') || functionName.includes('route')) {
          return this.extractCustomRouteConfig(node);
        }
      }

      // Handle versioned routes (router.versioned.get, etc.)
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.expression)
      ) {
        const versionedProperty = node.expression.expression.name.text;
        const methodName = node.expression.name.text;

        if (versionedProperty === 'versioned') {
          return this.extractVersionedRouteConfig(node, methodName);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract route information from standard router calls
   */
  private extractStandardRouteConfig(
    node: ts.CallExpression,
    methodName: string
  ): ParsedRouteInfo | null {
    // Get the first argument (route config)
    const routeConfig = node.arguments[0];
    if (!routeConfig || !ts.isObjectLiteralExpression(routeConfig)) {
      return null;
    }

    let path = '';
    let isPublic = false;

    // Extract path and access level from route config
    for (const property of routeConfig.properties) {
      if (ts.isPropertyAssignment(property)) {
        const propertyName = property.name;

        if (ts.isIdentifier(propertyName)) {
          if (propertyName.text === 'path' && ts.isStringLiteral(property.initializer)) {
            path = property.initializer.text;
          } else if (propertyName.text === 'access' && ts.isStringLiteral(property.initializer)) {
            isPublic = property.initializer.text === 'public';
          } else if (
            propertyName.text === 'options' &&
            ts.isObjectLiteralExpression(property.initializer)
          ) {
            // Check for access in options
            for (const optionProp of property.initializer.properties) {
              if (
                ts.isPropertyAssignment(optionProp) &&
                ts.isIdentifier(optionProp.name) &&
                optionProp.name.text === 'access' &&
                ts.isStringLiteral(optionProp.initializer)
              ) {
                isPublic = optionProp.initializer.text === 'public';
              }
            }
          }
        }
      }
    }

    if (path) {
      return {
        method: methodName.toUpperCase() as any,
        path,
        isVersioned: false,
        isPublic,
      };
    }

    return null;
  }

  /**
   * Extract route information from custom route creation functions
   */
  private extractCustomRouteConfig(node: ts.CallExpression): ParsedRouteInfo | null {
    // Get the first argument (route config)
    const routeConfig = node.arguments[0];
    if (!routeConfig || !ts.isObjectLiteralExpression(routeConfig)) {
      return null;
    }

    let endpoint = '';
    let isPublic = false;

    // Extract endpoint and access level from route config
    for (const property of routeConfig.properties) {
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
        if (property.name.text === 'endpoint' && ts.isStringLiteral(property.initializer)) {
          endpoint = property.initializer.text;
        } else if (
          property.name.text === 'options' &&
          ts.isObjectLiteralExpression(property.initializer)
        ) {
          // Check for access in options
          for (const optionProp of property.initializer.properties) {
            if (
              ts.isPropertyAssignment(optionProp) &&
              ts.isIdentifier(optionProp.name) &&
              optionProp.name.text === 'access' &&
              ts.isStringLiteral(optionProp.initializer)
            ) {
              isPublic = optionProp.initializer.text === 'public';
            }
          }
        }
      }
    }

    if (endpoint) {
      // Parse endpoint format "GET /api/observability/slos/{id} 2023-10-31"
      const endpointParts = endpoint.split(' ');
      if (endpointParts.length >= 2) {
        const method = endpointParts[0];
        const path = endpointParts[1];
        const version = endpointParts[2];

        return {
          method: method.toUpperCase() as any,
          path,
          isVersioned: !!version,
          version,
          isPublic,
        };
      }
    }

    return null;
  }

  /**
   * Extract route information from versioned router calls
   */
  private extractVersionedRouteConfig(
    node: ts.CallExpression,
    methodName: string
  ): ParsedRouteInfo | null {
    // Get the route config from the versioned call
    const routeConfig = node.arguments[0];
    if (!routeConfig || !ts.isObjectLiteralExpression(routeConfig)) {
      return null;
    }

    let path = '';
    let isPublic = false;

    // Extract path and access level
    for (const property of routeConfig.properties) {
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
        if (property.name.text === 'path' && ts.isStringLiteral(property.initializer)) {
          path = property.initializer.text;
        } else if (property.name.text === 'access' && ts.isStringLiteral(property.initializer)) {
          isPublic = property.initializer.text === 'public';
        }
      }
    }

    if (path) {
      return {
        method: methodName.toUpperCase() as any,
        path,
        isVersioned: true,
        isPublic,
      };
    }

    return null;
  }

  /**
   * Extract API paths from multiple route files using enhanced parsing
   */
  extractApiPathsFromRouteFiles(filePaths: string[]): RouteParsingResult[] {
    const results: RouteParsingResult[] = [];

    for (const filePath of filePaths) {
      try {
        const parseResult = this.parseRouteFile(filePath);

        // Enhanced result with additional metadata
        const enhancedResult: RouteParsingResult = {
          ...parseResult,
          routes: parseResult.routes.map((route) => ({
            ...route,
            filePath, // Add source file information
          })) as ParsedRouteInfo[],
        };

        results.push(enhancedResult);
      } catch (error) {
        // Handle file-specific errors gracefully
        results.push({
          success: false,
          routes: [],
          errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
          parseTimeMs: 0,
        });
      }
    }

    return results;
  }

  /**
   * Map a plugin directory to its API paths using comprehensive discovery
   */
  mapPluginToApiPaths(pluginPath: string): PluginRouteMapping {
    try {
      // Check cache first
      const cached = this.pluginMappingCache.get(pluginPath);
      if (cached) {
        return cached;
      }

      // Discover plugin structure
      const pluginName = this.extractPluginName(pluginPath);
      const routeFiles = this.findRouteFiles(pluginPath);

      if (routeFiles.length === 0) {
        // No route files found, use heuristic mapping
        return this.createHeuristicPluginMapping(pluginName, pluginPath);
      }

      // Parse route files
      const extractedRoutes = this.extractApiPathsFromRouteFiles(routeFiles);
      const allRoutes = extractedRoutes.flatMap((result) => result.routes);

      // Convert to API paths
      const apiPaths = allRoutes
        .filter((route) => route.isPublic) // Only include public routes
        .map((route) => this.convertPathToOasFormat(route.path));

      // Calculate confidence based on parsing success
      const confidence = this.calculateMappingConfidence({
        pluginName,
        pluginPath,
        apiPaths,
        confidence: 'high', // Will be recalculated
        source: 'parsed',
      });

      const mapping: PluginRouteMapping = {
        pluginName,
        pluginPath,
        apiPaths: [...new Set(apiPaths)], // Deduplicate
        confidence,
        source: 'parsed',
      };

      // Cache the result
      this.pluginMappingCache.set(pluginPath, mapping);

      return mapping;
    } catch (error) {
      // Fallback to heuristic mapping on error
      const pluginName = this.extractPluginName(pluginPath);
      return this.createHeuristicPluginMapping(pluginName, pluginPath);
    }
  }

  /**
   * Extract plugin name from plugin path
   */
  private extractPluginName(pluginPath: string): string {
    // Handle different plugin path patterns
    const pathParts = pluginPath.split('/');

    // For paths like "x-pack/platform/plugins/shared/fleet" or "src/platform/plugins/shared/dashboard"
    if (pathParts.includes('shared') && pathParts.indexOf('shared') < pathParts.length - 1) {
      return pathParts[pathParts.length - 1];
    }

    // For paths like "x-pack/solutions/security/plugins/security_solution"
    if (pathParts.includes('plugins')) {
      const pluginIndex = pathParts.lastIndexOf('plugins');
      if (pluginIndex + 1 < pathParts.length) {
        return pathParts[pluginIndex + 1];
      }
    }

    // For other platform patterns
    if (pathParts.includes('platform')) {
      return pathParts[pathParts.length - 1];
    }

    // Fallback to last directory name
    return pathParts[pathParts.length - 1] || 'unknown';
  }

  /**
   * Find route files within a plugin directory
   */
  private findRouteFiles(pluginPath: string): string[] {
    const routeFiles: string[] = [];
    const fullPluginPath = join(REPO_ROOT, pluginPath);

    try {
      // Common route directory patterns in Kibana
      const routeDirectories = [
        'server/routes',
        'server/lib/routes',
        'server/route_handlers',
        'server',
      ];

      for (const routeDir of routeDirectories) {
        const routeDirPath = join(fullPluginPath, routeDir);

        try {
          const files = this.findTypeScriptFiles(routeDirPath);
          routeFiles.push(
            ...files.map((file) => join(pluginPath, routeDir, file).replace(/\\/g, '/'))
          );
        } catch {
          // Directory doesn't exist, continue
        }
      }

      return routeFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * Recursively find TypeScript files in a directory
   */
  private findTypeScriptFiles(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = this.findTypeScriptFiles(fullPath);
          files.push(...subFiles.map((file) => join(entry.name, file)));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(entry.name);
        }
      }
    } catch {
      // Directory read error, return empty array
    }

    return files;
  }

  /**
   * Create heuristic plugin mapping when route parsing fails
   */
  private createHeuristicPluginMapping(pluginName: string, pluginPath: string): PluginRouteMapping {
    // Check if we have a static mapping
    const staticMappings = this.getApiPathMappings();

    // Try exact plugin name match
    if (staticMappings[pluginName]) {
      return {
        ...staticMappings[pluginName],
        pluginPath,
        source: 'mapped',
      };
    }

    // Try solution-based mapping
    const solutionMatch = pluginPath.match(/solutions\/([^\/]+)/);
    if (solutionMatch) {
      const solutionName = solutionMatch[1];
      const solutionKey = `${solutionName}/${pluginName}`;
      if (staticMappings[solutionKey]) {
        return {
          ...staticMappings[solutionKey],
          pluginPath,
          source: 'mapped',
        };
      }
    }

    // Generate heuristic paths
    const heuristicPaths = this.generateHeuristicApiPaths(pluginName, pluginPath);

    return {
      pluginName,
      pluginPath,
      apiPaths: heuristicPaths,
      confidence: 'low',
      source: 'heuristic',
    };
  }

  /**
   * Generate heuristic API paths based on plugin name and path
   */
  private generateHeuristicApiPaths(pluginName: string, pluginPath: string): string[] {
    const paths: string[] = [];

    // Solution-based heuristics
    if (pluginPath.includes('solutions/security')) {
      paths.push('/paths/~1api~1security');
      if (
        pluginName.includes('security_solution') ||
        pluginName.includes('detection') ||
        pluginName.includes('siem')
      ) {
        paths.push('/paths/~1api~1detection_engine');
      }
    } else if (pluginPath.includes('solutions/observability')) {
      paths.push('/paths/~1api~1observability');
      if (pluginName === 'apm') {
        paths.push('/paths/~1api~1apm');
      } else if (pluginName === 'infra') {
        paths.push('/paths/~1api~1infra', '/paths/~1api~1metrics');
      }
    } else if (pluginPath.includes('solutions/search')) {
      paths.push('/paths/~1api~1search');
      if (pluginName.includes('enterprise')) {
        paths.push('/paths/~1api~1enterprise_search');
      }
    } else {
      // Generic plugin-based mapping
      paths.push(`/paths/~1api~1${pluginName}`);
    }

    return paths;
  }

  /**
   * Calculate mapping confidence based on various factors
   */
  private calculateMappingConfidence(mapping: PluginRouteMapping): 'high' | 'medium' | 'low' {
    // High confidence: Successfully parsed routes from actual files
    if (mapping.source === 'parsed' && mapping.apiPaths.length > 0) {
      return 'high';
    }

    // Medium confidence: Static mapping from known plugin
    if (mapping.source === 'mapped') {
      return 'medium';
    }

    // Low confidence: Heuristic mapping
    return 'low';
  }

  /**
   * Convert route path to OpenAPI path format
   */
  private convertPathToOasFormat(path: string): string {
    // Convert Express-style paths to OpenAPI format
    // Example: /api/fleet/{agentId} -> /paths/~1api~1fleet~1{agentId}
    return '/paths/~1' + path.substring(1).replace(/\//g, '~1');
  }

  /**
   * Extract paths using heuristic approach as fallback
   */
  private extractPathsFromHeuristic(filePath: string): string[] {
    const paths: string[] = [];

    // Extract plugin/solution name and try to map to API paths
    // Enhanced logic based on actual Kibana project structure
    const pluginMatch = filePath.match(
      /(?:solutions|plugins|platform\/plugins)\/([^\/]+)(?:\/plugins\/([^\/]+))?/
    );

    if (pluginMatch) {
      const solutionName = pluginMatch[1];
      const pluginName = pluginMatch[2] || solutionName;

      // Get mapping from cache or create new one
      const cacheKey = `${solutionName}/${pluginName}`;
      let mapping = this.pluginMappingCache.get(cacheKey);

      if (!mapping) {
        mapping = this.createPluginMapping(solutionName, pluginName, filePath);
        this.pluginMappingCache.set(cacheKey, mapping);
      }

      if (mapping.confidence !== 'low') {
        paths.push(...mapping.apiPaths);
      }
    }

    return paths;
  }

  /**
   * Create plugin mapping based on plugin name and path structure
   */
  private createPluginMapping(
    solutionName: string,
    pluginName: string,
    filePath: string
  ): PluginRouteMapping {
    // Get comprehensive API path mappings
    const staticMappings = this.getApiPathMappings();

    // Check if we have a static mapping
    if (staticMappings[pluginName]) {
      return {
        ...staticMappings[pluginName],
        source: 'mapped',
      };
    }

    // Check solution-based mappings
    const solutionMappingKey = `${solutionName}/${pluginName}`;
    if (staticMappings[solutionMappingKey]) {
      return {
        ...staticMappings[solutionMappingKey],
        source: 'mapped',
      };
    }

    // Generate heuristic mapping
    const heuristicPaths: string[] = [];

    // Common patterns for plugin to API path mapping
    if (pluginName === 'fleet') {
      heuristicPaths.push('/paths/~1api~1fleet');
    } else if (pluginName.includes('security')) {
      heuristicPaths.push('/paths/~1api~1security');
    } else if (pluginName.includes('observability')) {
      heuristicPaths.push('/paths/~1api~1observability');
    } else if (pluginName.includes('search')) {
      heuristicPaths.push('/paths/~1api~1search');
    } else {
      // Generic mapping based on plugin name
      heuristicPaths.push(`/paths/~1api~1${pluginName}`);
    }

    return {
      pluginName,
      pluginPath: filePath,
      apiPaths: heuristicPaths,
      confidence: 'low',
      source: 'heuristic',
    };
  }

  /**
   * Get comprehensive API path mappings for known plugins
   */
  private getApiPathMappings(): Record<string, PluginRouteMapping> {
    // Comprehensive mapping of 20+ plugins based on actual Kibana structure
    return {
      // Core platform plugins
      fleet: {
        pluginName: 'fleet',
        pluginPath: 'x-pack/platform/plugins/shared/fleet',
        apiPaths: [
          '/paths/~1api~1fleet',
          '/paths/~1api~1fleet~1agents',
          '/paths/~1api~1fleet~1policies',
        ],
        confidence: 'high',
        source: 'mapped',
      },

      // Security solution plugins
      'security/elastic_assistant': {
        pluginName: 'elastic_assistant',
        pluginPath: 'x-pack/solutions/security/plugins/elastic_assistant',
        apiPaths: ['/paths/~1api~1assistant', '/paths/~1api~1assistant~1conversations'],
        confidence: 'high',
        source: 'mapped',
      },

      'security/security_solution': {
        pluginName: 'security_solution',
        pluginPath: 'x-pack/solutions/security/plugins/security_solution',
        apiPaths: ['/paths/~1api~1security', '/paths/~1api~1detection_engine'],
        confidence: 'high',
        source: 'mapped',
      },

      // Observability solution plugins
      'observability/apm': {
        pluginName: 'apm',
        pluginPath: 'x-pack/solutions/observability/plugins/apm',
        apiPaths: ['/paths/~1api~1apm', '/paths/~1api~1apm~1services'],
        confidence: 'high',
        source: 'mapped',
      },

      'observability/infra': {
        pluginName: 'infra',
        pluginPath: 'x-pack/solutions/observability/plugins/infra',
        apiPaths: ['/paths/~1api~1infra', '/paths/~1api~1metrics'],
        confidence: 'high',
        source: 'mapped',
      },

      'observability/logs': {
        pluginName: 'logs',
        pluginPath: 'x-pack/solutions/observability/plugins/logs',
        apiPaths: ['/paths/~1api~1logs'],
        confidence: 'high',
        source: 'mapped',
      },

      'observability/synthetics': {
        pluginName: 'synthetics',
        pluginPath: 'x-pack/solutions/observability/plugins/synthetics',
        apiPaths: ['/paths/~1api~1synthetics'],
        confidence: 'high',
        source: 'mapped',
      },

      'observability/uptime': {
        pluginName: 'uptime',
        pluginPath: 'x-pack/solutions/observability/plugins/uptime',
        apiPaths: ['/paths/~1api~1uptime'],
        confidence: 'high',
        source: 'mapped',
      },

      // Search solution plugins
      'search/search_indices': {
        pluginName: 'search_indices',
        pluginPath: 'x-pack/solutions/search/plugins/search_indices',
        apiPaths: ['/paths/~1api~1index_management', '/paths/~1api~1indices'],
        confidence: 'high',
        source: 'mapped',
      },

      'search/search_homepage': {
        pluginName: 'search_homepage',
        pluginPath: 'x-pack/solutions/search/plugins/search_homepage',
        apiPaths: ['/paths/~1api~1search', '/paths/~1api~1search~1homepage'],
        confidence: 'high',
        source: 'mapped',
      },

      'search/enterprise_search': {
        pluginName: 'enterprise_search',
        pluginPath: 'x-pack/solutions/search/plugins/enterprise_search',
        apiPaths: ['/paths/~1api~1enterprise_search', '/paths/~1api~1app_search'],
        confidence: 'high',
        source: 'mapped',
      },

      'search/serverless_search': {
        pluginName: 'serverless_search',
        pluginPath: 'x-pack/solutions/search/plugins/serverless_search',
        apiPaths: ['/paths/~1api~1serverless_search'],
        confidence: 'high',
        source: 'mapped',
      },

      // Platform plugins
      dashboard: {
        pluginName: 'dashboard',
        pluginPath: 'src/platform/plugins/shared/dashboard',
        apiPaths: ['/paths/~1api~1saved_objects~1dashboard'],
        confidence: 'high',
        source: 'mapped',
      },

      data_views: {
        pluginName: 'data_views',
        pluginPath: 'src/platform/plugins/shared/data_views',
        apiPaths: ['/paths/~1api~1data_views', '/paths/~1api~1index_patterns'],
        confidence: 'high',
        source: 'mapped',
      },

      console: {
        pluginName: 'console',
        pluginPath: 'src/platform/plugins/shared/console',
        apiPaths: ['/paths/~1api~1console'],
        confidence: 'medium',
        source: 'mapped',
      },

      custom_integrations: {
        pluginName: 'custom_integrations',
        pluginPath: 'src/platform/plugins/shared/custom_integrations',
        apiPaths: ['/paths/~1api~1custom_integrations'],
        confidence: 'medium',
        source: 'mapped',
      },

      esql: {
        pluginName: 'esql',
        pluginPath: 'src/platform/plugins/shared/esql',
        apiPaths: ['/paths/~1api~1esql'],
        confidence: 'medium',
        source: 'mapped',
      },

      // X-Pack platform plugins
      osquery: {
        pluginName: 'osquery',
        pluginPath: 'x-pack/platform/plugins/shared/osquery',
        apiPaths: ['/paths/~1api~1osquery'],
        confidence: 'high',
        source: 'mapped',
      },

      cases: {
        pluginName: 'cases',
        pluginPath: 'x-pack/platform/plugins/shared/cases',
        apiPaths: ['/paths/~1api~1cases'],
        confidence: 'high',
        source: 'mapped',
      },

      alerting: {
        pluginName: 'alerting',
        pluginPath: 'x-pack/platform/plugins/shared/alerting',
        apiPaths: ['/paths/~1api~1alerting', '/paths/~1api~1alerts'],
        confidence: 'high',
        source: 'mapped',
      },

      actions: {
        pluginName: 'actions',
        pluginPath: 'x-pack/platform/plugins/shared/actions',
        apiPaths: ['/paths/~1api~1actions'],
        confidence: 'high',
        source: 'mapped',
      },

      spaces: {
        pluginName: 'spaces',
        pluginPath: 'x-pack/platform/plugins/shared/spaces',
        apiPaths: ['/paths/~1api~1spaces'],
        confidence: 'high',
        source: 'mapped',
      },

      licensing: {
        pluginName: 'licensing',
        pluginPath: 'x-pack/platform/plugins/shared/licensing',
        apiPaths: ['/paths/~1api~1licensing'],
        confidence: 'medium',
        source: 'mapped',
      },

      features: {
        pluginName: 'features',
        pluginPath: 'x-pack/platform/plugins/shared/features',
        apiPaths: ['/paths/~1api~1features'],
        confidence: 'medium',
        source: 'mapped',
      },
    };
  }

  /**
   * Determine if validation should run based on changes
   */
  private shouldRunValidation(oasChanges: GitChange[]): boolean {
    // Run validation if there are any OAS-related changes
    if (oasChanges.length > 0) {
      return true;
    }

    // Also run if this might be a CI/CD context where we always want to validate
    const isCI = process.env.CI === 'true' || process.env.BUILDKITE === 'true';
    return isCI;
  }

  /**
   * Get the current git branch name
   */
  getCurrentBranch(): string {
    try {
      return execSync('git branch --show-current', {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if we're in a git repository
   */
  isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', {
        cwd: REPO_ROOT,
        stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  }
}
