/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import JSZip from 'jszip';
import type { DashboardTerraformResponseBody } from '../../../../../server';

export interface ModuleFile {
  name: string;
  language: 'json' | 'markdown';
  content: string;
}

/** Adopt manages the saved dashboard in place; copy creates a new dashboard and pins nothing. */
export type ExportMode = { kind: 'adopt'; spaceId: string; dashboardId: string } | { kind: 'copy' };

export const MAIN_FILE = 'main.tf.json';
const IMPORTS_FILE = 'imports.tf.json';

/** A valid Terraform identifier from the title, `dashboard` when nothing in the title qualifies. */
export const toResourceName = (title: string): string => {
  const name = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!name) return 'dashboard';
  return /^[0-9]/.test(name) ? `_${name}` : name;
};

/** The zip's file name: the dashboard title without characters file systems reject. */
export const toZipFilename = (title: string): string =>
  `${
    title
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim()
      .slice(0, 180) || 'dashboard'
  }.zip`;

const json = (value: object) => `${JSON.stringify(value, null, 2)}\n`;

// Saved object IDs may be any string, and strings in Terraform JSON syntax are templates, so `${` and `%{`
// in an ID are written in their literal forms, as the conversion does for the dashboard's text.
const escapeTemplate = (text: string): string =>
  text.replace(/\$\{/g, () => '$${').replace(/%\{/g, () => '%%{');

const firstPlan = (mode: ExportMode) =>
  mode.kind === 'adopt'
    ? `This module adopts the existing dashboard \`${mode.dashboardId}\` in space \`${mode.spaceId}\`:
Terraform manages it in place from now on. \`${IMPORTS_FILE}\` imports it, so the first plan should
show

    Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.

A change in that plan means the export differs from the saved dashboard, for example because it
includes unsaved changes; review it before you apply. You can delete \`${IMPORTS_FILE}\` after the
first apply.`
    : `This module creates a new copy of the dashboard; the original is not changed. The first plan
should show

    Plan: 1 to add, 0 to change, 0 to destroy.`;

const readme = (
  { source, version }: DashboardTerraformResponseBody['provider'],
  mode: ExportMode
) => `# Dashboard exported from Kibana

${firstPlan(mode)}

It was generated for the ${source} provider; \`versions.tf.json\` requires version
${version} or later. This export is a technical preview.

The files use Terraform's JSON configuration syntax (\`.tf.json\`). Terraform and OpenTofu load
them like \`.tf\` files; you can convert them to HCL yourself if you prefer.

    export KIBANA_ENDPOINT=...  KIBANA_API_KEY=...
    terraform init
    terraform plan

Text from the dashboard that Terraform would read as a template (\`\${\` or \`%{\`) is written as
\`$\${\` or \`%%{\`, so Terraform keeps it as it is.
`;

/** The files of the module for the chosen mode, in the order the flyout lists them. */
export const buildModuleFiles = (
  conversion: DashboardTerraformResponseBody,
  resourceName: string,
  mode: ExportMode
): ModuleFile[] => {
  const { provider, resource_type: resourceType, body } = conversion;
  return [
    {
      name: 'versions.tf.json',
      language: 'json',
      content: json({
        terraform: {
          required_providers: {
            elasticstack: { source: provider.source, version: `>= ${provider.version}` },
          },
        },
        provider: { elasticstack: {} },
      }),
    },
    {
      name: MAIN_FILE,
      language: 'json',
      content: json({
        resource: {
          [resourceType]: {
            [resourceName]:
              mode.kind === 'adopt'
                ? {
                    space_id: mode.spaceId,
                    dashboard_id: escapeTemplate(mode.dashboardId),
                    ...body,
                  }
                : body,
          },
        },
      }),
    },
    ...(mode.kind === 'adopt'
      ? [
          {
            name: IMPORTS_FILE,
            language: 'json' as const,
            content: json({
              import: [
                {
                  to: `${resourceType}.${resourceName}`,
                  id: escapeTemplate(`${mode.spaceId}/${mode.dashboardId}`),
                },
              ],
            }),
          },
        ]
      : []),
    { name: 'README.md', language: 'markdown', content: readme(provider, mode) },
  ];
};

/** One zip with every file inside a single folder, so extracting it never scatters files. */
export const buildModuleZip = (folder: string, files: readonly ModuleFile[]): Promise<Blob> => {
  const zip = new JSZip();
  const dir = zip.folder(folder) ?? zip;
  for (const { name, content } of files) dir.file(name, content);
  return zip.generateAsync({ type: 'blob' });
};
