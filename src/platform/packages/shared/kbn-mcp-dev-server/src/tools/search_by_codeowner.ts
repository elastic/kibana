/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { execFile } from 'child_process';
import { promisify } from 'util';

import type { ToolDefinition } from '../types';

const execFileAsync = promisify(execFile);

interface CodeOwnerRule {
  pattern: string;
  teams: string[];
  specificity: number;
}

interface SearchResult {
  searchTerm: string;
  team: string;
  totalScannedFiles: number;
  totalMatchingFiles: number;
  matchingFiles: string[];
  analysisTimeMs: number;
}

const searchByCodeownerInputSchema = z.object({
  searchTerm: z.string().describe('The term to search for in files (case-insensitive)'),
  team: z
    .string()
    .describe('The GitHub team to filter by (e.g., "@elastic/kibana-data-discovery")'),
});

function loadCodeOwners(): CodeOwnerRule[] {
  const codeownersPath = path.join(REPO_ROOT, '.github', 'CODEOWNERS');
  const rules: CodeOwnerRule[] = [];

  try {
    const content = fs.readFileSync(codeownersPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse line: pattern @team1 @team2 ...
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) {
        continue;
      }

      const pattern = parts[0];
      const teams = parts.slice(1).filter((part) => part.startsWith('@'));

      if (teams.length > 0) {
        // Calculate specificity: more path segments = more specific
        const specificity = pattern.split('/').filter((seg) => seg && seg !== '*').length;

        rules.push({
          pattern,
          teams,
          specificity,
        });
      }
    }
  } catch (error) {
    // If CODEOWNERS doesn't exist or can't be read, return empty array
  }

  return rules;
}

function getTeamPaths(team: string, codeOwnerRules: CodeOwnerRule[]): string[] {
  const normalizedTeam = team.toLowerCase();
  const teamPaths: string[] = [];
  const seenPaths = new Set<string>();

  for (const rule of codeOwnerRules) {
    const hasTeam = rule.teams.some((t) => t.toLowerCase() === normalizedTeam);
    if (hasTeam) {
      // Convert CODEOWNERS pattern to actual path
      let pattern = rule.pattern;
      // Remove leading slash
      if (pattern.startsWith('/')) {
        pattern = pattern.substring(1);
      }
      // Remove wildcards for directory matching
      pattern = pattern.replace(/\*/g, '');
      // Remove trailing slash
      pattern = pattern.replace(/\/$/, '');

      if (pattern) {
        const fullPath = path.join(REPO_ROOT, pattern);

        // Only add if it's a directory that exists and we haven't seen it
        if (!seenPaths.has(fullPath)) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
              teamPaths.push(fullPath);
              seenPaths.add(fullPath);
            }
          } catch (error) {
            // Path doesn't exist or can't be accessed, skip it
          }
        }
      }
    }
  }

  return teamPaths;
}

async function searchWithGrepInPaths(searchTerm: string, paths: string[]): Promise<string[]> {
  if (paths.length === 0) {
    return [];
  }

  try {
    const args = [
      '-ril', // recursive, ignore case, files with matches
      '--include=*.js',
      '--include=*.jsx',
      '--include=*.ts',
      '--include=*.tsx',
      '--include=*.json',
      '--include=*.md',
      '--include=*.yml',
      '--include=*.yaml',
      '--exclude-dir=node_modules',
      '--exclude-dir=.git',
      '--exclude-dir=build',
      '--exclude-dir=target',
      searchTerm,
      ...paths, // Search only in these paths
    ];

    const { stdout } = await execFileAsync('grep', args, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    const files = stdout
      .split('\n')
      .filter((line) => line.trim())
      .map((file) => path.resolve(file));

    return files;
  } catch (error: any) {
    // grep returns exit code 1 when no matches are found (not an error)
    if (error.code === 1 && error.stdout) {
      const files = error.stdout
        .toString()
        .split('\n')
        .filter((line: string) => line.trim())
        .map((file: string) => path.resolve(file));
      return files;
    }

    // For any other error, return empty array
    return [];
  }
}

async function performSearch(searchTerm: string, team: string): Promise<SearchResult> {
  const startTime = Date.now();
  const codeOwnerRules = loadCodeOwners();

  // Normalize team name (ensure it starts with @)
  const normalizedTeam = team.startsWith('@') ? team : `@${team}`;

  // First, get all paths owned by the team from CODEOWNERS
  const teamPaths = getTeamPaths(normalizedTeam, codeOwnerRules);

  // Then search only in those paths (much faster!)
  const matchingFiles = await searchWithGrepInPaths(searchTerm, teamPaths);

  const relativeFiles = matchingFiles.map((file) => path.relative(REPO_ROOT, file)).sort();

  const endTime = Date.now();

  return {
    searchTerm,
    team: normalizedTeam,
    totalScannedFiles: teamPaths.length, // Number of team-owned paths searched
    totalMatchingFiles: relativeFiles.length,
    matchingFiles: relativeFiles,
    analysisTimeMs: endTime - startTime,
  };
}

export const searchByCodeownerTool: ToolDefinition<typeof searchByCodeownerInputSchema> = {
  name: 'search_by_codeowner',
  description:
    'Search for a term in files owned by a specific team based on CODEOWNERS. Returns all files containing the search term that are owned by the specified team.',
  inputSchema: searchByCodeownerInputSchema,
  handler: async (input) => {
    const result = await performSearch(input.searchTerm, input.team);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
