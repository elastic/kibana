/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import {
  ALL_SPECS_PATH,
  CODEOWNERS_PATH,
  CONNECTOR_OWNERS_MARKER_END,
  CONNECTOR_OWNERS_MARKER_START,
  ICONS_MAP_PATH,
  REGENERATE_COMMAND,
  computeConnectorRegistry,
  computeUpdatedCodeowners,
  extractConnectorExportName,
  extractConnectorId,
  extractConnectorOwner,
  findIconImportPath,
  renderAllSpecsFile,
  renderConnectorIconsMapFile,
  renderConnectorOwnersCodeownersLines,
  toChunkName,
} from './generate_connector_registries';

function assertUpToDate(label: string, actual: string, expected: string) {
  if (actual !== expected) {
    throw new Error(
      `${label} is out of date with src/specs/. Run \`${REGENERATE_COMMAND}\` and commit the result.`
    );
  }
}

// The generator itself resolves the license header from `.eslintrc.js` via the real ESLint
// config loader (see `resolveLicenseHeader` in generate_connector_registries.ts), which isn't
// safe to call from inside Jest (its `require()`-based config/plugin loading conflicts with
// Jest's module registry). So this test instead reads back whatever header is already at the top
// of the generated file and asserts the rest of the content matches around it — the header's own
// correctness is enforced independently by the repo-wide `@kbn/eslint/require-license-header`
// lint rule.
function extractLeadingLicenseHeader(fileContent: string): string {
  const match = fileContent.match(/^\/\*[\s\S]*?\*\//);
  if (!match) {
    throw new Error('Expected the file to start with a `/* ... */` license header comment.');
  }
  return match[0];
}

/**
 * Extracts the generated per-connector lines currently between the CODEOWNERS markers, the same
 * way `extractLeadingLicenseHeader` reads back an already-generated header: comparing against
 * what's on disk rather than re-deriving it from `.eslintrc.js`/ESLint internals in-process.
 */
function extractGeneratedCodeownersLines(codeownersContent: string): string {
  const startIdx = codeownersContent.indexOf(CONNECTOR_OWNERS_MARKER_START);
  const endIdx = codeownersContent.indexOf(CONNECTOR_OWNERS_MARKER_END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Expected to find the generated connector owners markers in CODEOWNERS.');
  }
  return codeownersContent
    .slice(startIdx + CONNECTOR_OWNERS_MARKER_START.length, endIdx)
    .replace(/^\n/, '')
    .replace(/\n$/, '');
}

describe('generate_connector_registries', () => {
  describe('generated registry files', () => {
    it('all_specs.ts matches what the generator would produce', () => {
      const entries = computeConnectorRegistry();
      const currentContent = readFileSync(ALL_SPECS_PATH, 'utf8');
      const licenseHeader = extractLeadingLicenseHeader(currentContent);
      assertUpToDate('all_specs.ts', currentContent, renderAllSpecsFile(entries, licenseHeader));
    });

    it('connector_icons_map.ts matches what the generator would produce', () => {
      const entries = computeConnectorRegistry();
      const currentContent = readFileSync(ICONS_MAP_PATH, 'utf8');
      const licenseHeader = extractLeadingLicenseHeader(currentContent);
      assertUpToDate(
        'connector_icons_map.ts',
        currentContent,
        renderConnectorIconsMapFile(entries, licenseHeader)
      );
    });

    it('.github/CODEOWNERS generated connector owners block matches what the generator would produce', () => {
      const entries = computeConnectorRegistry();
      const currentContent = readFileSync(CODEOWNERS_PATH, 'utf8');
      assertUpToDate(
        '.github/CODEOWNERS',
        extractGeneratedCodeownersLines(currentContent),
        renderConnectorOwnersCodeownersLines(entries)
      );
    });
  });

  describe('computeConnectorRegistry', () => {
    it('finds at least one connector and every id starts with a dot', () => {
      const entries = computeConnectorRegistry();
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.id.startsWith('.')).toBe(true);
      }
    });

    it('returns entries sorted alphabetically by id', () => {
      const ids = computeConnectorRegistry().map((e) => e.id);
      expect(ids).toEqual([...ids].sort());
    });

    it('every connector has a registered icon', () => {
      const missingIcons = computeConnectorRegistry()
        .filter((e) => e.iconImportPath === null)
        .map((e) => e.id);
      expect(missingIcons).toEqual([]);
    });

    it('has no duplicate ids', () => {
      const ids = computeConnectorRegistry().map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every connector declares a valid @elastic/... OWNER', () => {
      const entries = computeConnectorRegistry();
      for (const entry of entries) {
        expect(entry.owner).toMatch(/^@elastic\/[a-z0-9-]+$/);
      }
    });

    it('every connector has a non-empty exportName', () => {
      const entries = computeConnectorRegistry();
      for (const entry of entries) {
        expect(entry.exportName.length).toBeGreaterThan(0);
      }
    });
  });

  describe('extractConnectorId', () => {
    it('extracts an inline string literal id', () => {
      expect(extractConnectorId(`metadata: {\n  id: '.abuseipdb',\n},`)).toBe('.abuseipdb');
    });

    it('resolves an id defined as a local constant', () => {
      const content = [
        "const JINA_READER_CONNECTOR_ID = '.jina';",
        'export const spec = {',
        '  metadata: {',
        '    id: JINA_READER_CONNECTOR_ID,',
        '  },',
        '};',
      ].join('\n');
      expect(extractConnectorId(content)).toBe('.jina');
    });

    it('returns null for content with no metadata.id', () => {
      expect(extractConnectorId('export const helper = () => {};')).toBeNull();
    });
  });

  describe('extractConnectorExportName', () => {
    it('extracts the identifier a ConnectorSpec is exported under', () => {
      expect(extractConnectorExportName('export const Slack: ConnectorSpec = {')).toBe('Slack');
    });

    it('returns null when there is no ConnectorSpec export', () => {
      expect(extractConnectorExportName('export const helper = () => {};')).toBeNull();
    });
  });

  describe('extractConnectorOwner', () => {
    it('extracts a single-quoted OWNER declaration', () => {
      expect(extractConnectorOwner(`export const OWNER = '@elastic/workchat-eng';`)).toBe(
        '@elastic/workchat-eng'
      );
    });

    it('extracts a double-quoted OWNER declaration', () => {
      expect(extractConnectorOwner(`export const OWNER = "@elastic/workflows-eng";`)).toBe(
        '@elastic/workflows-eng'
      );
    });

    it('returns null when there is no OWNER declaration', () => {
      expect(extractConnectorOwner('export const helper = () => {};')).toBeNull();
    });
  });

  describe('computeUpdatedCodeowners', () => {
    const entries = [
      {
        id: '.foo',
        exportName: 'Foo',
        specImportPath: './specs/foo/foo',
        iconImportPath: null,
        owner: '@elastic/foo-team',
        specDirName: 'foo',
      },
    ];

    it('replaces only the content between the markers', () => {
      const before = [
        '# Connector Specs',
        'src/platform/packages/shared/kbn-connector-specs/src/specs/**',
        CONNECTOR_OWNERS_MARKER_START,
        'src/platform/packages/shared/kbn-connector-specs/src/specs/stale/** @elastic/stale-team',
        CONNECTOR_OWNERS_MARKER_END,
        '',
        '# Connector Agent Skills',
        'src/platform/packages/shared/kbn-connector-specs/.claude/skills @elastic/workchat-eng',
      ].join('\n');

      const result = computeUpdatedCodeowners(before, entries);

      expect(result).toBe(
        [
          '# Connector Specs',
          'src/platform/packages/shared/kbn-connector-specs/src/specs/**',
          CONNECTOR_OWNERS_MARKER_START,
          'src/platform/packages/shared/kbn-connector-specs/src/specs/foo/** @elastic/foo-team',
          CONNECTOR_OWNERS_MARKER_END,
          '',
          '# Connector Agent Skills',
          'src/platform/packages/shared/kbn-connector-specs/.claude/skills @elastic/workchat-eng',
        ].join('\n')
      );
    });

    it('throws when a marker is missing', () => {
      expect(() => computeUpdatedCodeowners('# Connector Specs\n', entries)).toThrow(
        /Could not find both/
      );
    });

    it('throws when the end marker appears before the start marker', () => {
      const malformed = `${CONNECTOR_OWNERS_MARKER_END}\n${CONNECTOR_OWNERS_MARKER_START}`;
      expect(() => computeUpdatedCodeowners(malformed, entries)).toThrow(/appears before/);
    });
  });

  describe('renderConnectorOwnersCodeownersLines', () => {
    it('collapses connectors that share a top-level spec directory into one line', () => {
      const lines = renderConnectorOwnersCodeownersLines([
        {
          id: '.confluence-cloud',
          exportName: 'ConfluenceCloudConnector',
          specImportPath: './specs/atlassian/confluence_cloud/confluence',
          iconImportPath: null,
          owner: '@elastic/workchat-eng',
          specDirName: 'atlassian',
        },
        {
          id: '.jira-cloud',
          exportName: 'JiraConnector',
          specImportPath: './specs/atlassian/jira-cloud/jira',
          iconImportPath: null,
          owner: '@elastic/workchat-eng',
          specDirName: 'atlassian',
        },
      ]);

      expect(lines).toBe(
        'src/platform/packages/shared/kbn-connector-specs/src/specs/atlassian/** @elastic/workchat-eng'
      );
    });

    it('throws when connectors in the same spec directory disagree on OWNER', () => {
      expect(() =>
        renderConnectorOwnersCodeownersLines([
          {
            id: '.a',
            exportName: 'A',
            specImportPath: './specs/foo/a',
            iconImportPath: null,
            owner: '@elastic/team-a',
            specDirName: 'foo',
          },
          {
            id: '.b',
            exportName: 'B',
            specImportPath: './specs/foo/b',
            iconImportPath: null,
            owner: '@elastic/team-b',
            specDirName: 'foo',
          },
        ])
      ).toThrow(/inconsistent OWNER/);
    });
  });

  describe('toChunkName', () => {
    it.each([
      ['.abuseipdb', 'connectorIconAbuseipdb'],
      ['.aws_x_ray', 'connectorIconAwsXRay'],
      ['.sharepoint-online', 'connectorIconSharepointOnline'],
      ['.confluence-cloud', 'connectorIconConfluenceCloud'],
      ['.slack2', 'connectorIconSlack2'],
    ])('derives %s -> %s', (id, expected) => {
      expect(toChunkName(id)).toBe(expected);
    });
  });

  describe('findIconImportPath', () => {
    it('returns null when there is no icon directory', () => {
      expect(findIconImportPath(__dirname)).toBeNull();
    });
  });
});
