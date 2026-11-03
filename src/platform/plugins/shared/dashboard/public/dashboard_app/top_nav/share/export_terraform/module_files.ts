/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import JSZip from 'jszip';
import type {
  JsonObject,
  JsonValue,
  LinkedResource,
  TerraformPath,
} from '@kbn/as-code-dashboard-terraform';
import type { DashboardTerraformResponseBody } from '../../../../../server';

export interface ModuleFile {
  name: string;
  language: 'json' | 'markdown';
  content: string;
}

/** Adopt manages the saved dashboard in place; copy creates a new dashboard and pins nothing. */
export type ExportMode = { kind: 'adopt'; spaceId: string; dashboardId: string } | { kind: 'copy' };

export const MAIN_FILE = 'main.tf.json';
const TAGS_FILE = 'tags.tf.json';
const IMPORTS_FILE = 'imports.tf.json';

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

/** The tag resources the module writes: a new copy creates the dashboard's readable tags; adopting writes none yet. */
export const exportedTags = (
  { resources, tag_resource: tagResource }: DashboardTerraformResponseBody,
  mode: ExportMode
): LinkedResource[] =>
  mode.kind === 'copy' ? resources.filter(({ type }) => type === tagResource.type) : [];

// The same as the package's (which the browser cannot import): a path the route reported always exists.
const setAt = (value: JsonValue, [step, ...rest]: TerraformPath, leaf: JsonValue): JsonValue => {
  if (step === undefined) return leaf;
  if (Array.isArray(value) && typeof step === 'number') {
    return value.map((item, i) => (i === step ? setAt(item, rest, leaf) : item));
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && typeof step === 'string') {
    return { ...value, [step]: setAt(value[step], rest, leaf) };
  }
  throw new Error(`No value at ${JSON.stringify([step, ...rest])}`);
};

// The route links the body to every resource it wrote; a reference to a resource this mode does not write goes back
// to the object's literal ID, escaped like the rest of the body.
const dashboardBody = (
  { body, links, resources }: DashboardTerraformResponseBody,
  written: readonly LinkedResource[]
): JsonObject =>
  links.reduce<JsonObject>((linked, { path, resource_type: type, resource_name: name }) => {
    const isWritten = written.some((r) => r.type === type && r.name === name);
    const resource = resources.find((r) => r.type === type && r.name === name);
    if (isWritten || !resource) return linked;
    return setAt(linked, path, escapeTemplate(resource.id)) as JsonObject;
  }, body);

const firstPlan = (mode: ExportMode, tagCount: number) =>
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

    Plan: ${1 + tagCount} to add, 0 to change, 0 to destroy.`;

const tagsSection = (count: number, minKibanaVersion: string): string =>
  count
    ? `
\`${TAGS_FILE}\` creates the dashboard's tags (${count}) as new tags, and the dashboard refers to them.
The tags file requires the Kibana Terraform applies to to be ${minKibanaVersion} or later, and Kibana
refuses a tag whose name already exists. If the target is older, or already has tags with these names,
delete \`${TAGS_FILE}\` and set the dashboard's \`tags\` in \`${MAIN_FILE}\` to the IDs of existing tags.
The tags are created in the dashboard's space; if you set a \`space_id\` on the dashboard, set the same on each tag.
`
    : '';

const readme = (
  { source, version }: DashboardTerraformResponseBody['provider'],
  mode: ExportMode,
  tagCount: number,
  minKibanaVersion: string
) => `# Dashboard exported from Kibana

${firstPlan(mode, tagCount)}
${tagsSection(tagCount, minKibanaVersion)}
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
  mode: ExportMode
): ModuleFile[] => {
  const {
    provider,
    resource_type: resourceType,
    resource_name: resourceName,
    tag_resource: tagResource,
  } = conversion;
  const tags = exportedTags(conversion, mode);
  const body = dashboardBody(conversion, tags);
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
    ...(tags.length
      ? [
          {
            name: TAGS_FILE,
            language: 'json' as const,
            content: json({
              resource: {
                [tagResource.type]: Object.fromEntries(
                  tags.map(({ name, body: tagBody }) => [name, tagBody])
                ),
              },
            }),
          },
        ]
      : []),
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
    {
      name: 'README.md',
      language: 'markdown',
      content: readme(provider, mode, tags.length, tagResource.min_kibana_version),
    },
  ];
};

/** One zip with every file inside a single folder, so extracting it never scatters files. */
export const buildModuleZip = (folder: string, files: readonly ModuleFile[]): Promise<Blob> => {
  const zip = new JSZip();
  const dir = zip.folder(folder) ?? zip;
  for (const { name, content } of files) dir.file(name, content);
  return zip.generateAsync({ type: 'blob' });
};
