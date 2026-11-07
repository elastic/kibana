/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import JSZip from 'jszip';
import type { JsonObject, JsonValue } from '@kbn/utility-types';
import type { LinkedResource } from '@kbn/as-code-dashboard-terraform';
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
const DATA_VIEWS_FILE = 'data_views.tf.json';
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

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const json = (value: object) => `${JSON.stringify(value, null, 2)}\n`;

// Saved object IDs may be any string, and strings in Terraform JSON syntax are templates, so `${` and `%{`
// in an ID are written in their literal forms, as the conversion does for the dashboard's text.
const escapeTemplate = (text: string): string =>
  text.replace(/\$\{/g, () => '$${').replace(/%\{/g, () => '%%{');

/** The tag resources the module writes: the dashboard's tags that are readable and not managed by Kibana. */
export const exportedTags = ({
  resources,
  tag_resource: tagResource,
}: DashboardTerraformResponseBody): LinkedResource[] =>
  resources.filter(({ type }) => type === tagResource.type);

/** The data view resources the module writes: the dashboard's saved data views that are readable and not managed. */
export const exportedDataViews = ({
  resources,
  data_view_resource: dataViewResource,
}: DashboardTerraformResponseBody): LinkedResource[] =>
  resources.filter(({ type }) => type === dataViewResource.type);

// Adopting pins each tag's ID and space, as it does the dashboard's; a new copy pins nothing.
const tagResourceBody = ({ id, body }: LinkedResource, mode: ExportMode): JsonObject =>
  mode.kind === 'adopt' ? { space_id: mode.spaceId, tag_id: escapeTemplate(id), ...body } : body;

// Adopting pins each data view's ID and space, and writes the spaces it is shared to: without them, the first apply
// would remove a shared data view from every other space.
const dataViewResourceBody = (
  { id, body }: LinkedResource,
  { data_views: details }: DashboardTerraformResponseBody,
  mode: ExportMode
): JsonObject => {
  if (mode.kind === 'copy') return body;
  const namespaces = details.find((dataView) => dataView.id === id)?.namespaces ?? [];
  const dataView = isJsonObject(body.data_view) ? body.data_view : {};
  return {
    space_id: mode.spaceId,
    ...body,
    data_view: {
      id: escapeTemplate(id),
      ...(namespaces.length && { namespaces }),
      ...dataView,
    },
  };
};

const firstPlan = (mode: ExportMode, resourceCount: number) =>
  mode.kind === 'adopt'
    ? `This module adopts the existing dashboard \`${mode.dashboardId}\` in space \`${mode.spaceId}\`:
Terraform manages it in place from now on. \`${IMPORTS_FILE}\` imports it, so the first plan should
show

    Plan: ${resourceCount} to import, 0 to add, 0 to change, 0 to destroy.

A change in that plan means the export differs from the saved dashboard, for example because it
includes unsaved changes; review it before you apply. You can delete \`${IMPORTS_FILE}\` after the
first apply.`
    : `This module creates a new copy of the dashboard; the original is not changed. The first plan
should show

    Plan: ${resourceCount} to add, 0 to change, 0 to destroy.`;

const dataViewsSection = (mode: ExportMode, count: number, resourceType: string): string => {
  if (!count) return '';
  if (mode.kind === 'adopt') {
    return `
\`${DATA_VIEWS_FILE}\` adopts the dashboard's data views (${count}) the same way, and \`${IMPORTS_FILE}\`
imports each; the dashboard refers to them. Each data view keeps the spaces it is shared to now
(\`namespaces\`); a space you remove from that list loses the data view at the next apply.
`;
  }
  return `
\`${DATA_VIEWS_FILE}\` creates the dashboard's data views (${count}) as new data views, and every place the
dashboard uses one refers to it. The data views are created in the dashboard's space; if you set a
\`space_id\` on the dashboard, set the same on each data view. Each data view's index pattern must match
indices where Terraform applies it, or the panels using it are empty.

Each copy creates new data views: copying a second dashboard that uses the same data view into
the same Kibana creates a second one.
To reuse data views that already exist in the target, delete \`${DATA_VIEWS_FILE}\` and replace each
\`\${${resourceType}.<name>.data_view.id}\` reference in \`${MAIN_FILE}\` with the ID of an
existing data view.
`;
};

const tagsSection = (mode: ExportMode, count: number, minKibanaVersion: string): string => {
  if (!count) return '';
  if (mode.kind === 'adopt') {
    return `
\`${TAGS_FILE}\` adopts the dashboard's tags (${count}) the same way, and \`${IMPORTS_FILE}\` imports
each; the dashboard refers to them. The tags file requires the Kibana Terraform applies to to be
${minKibanaVersion} or later. If it is older, delete \`${TAGS_FILE}\`, remove the tag imports from
\`${IMPORTS_FILE}\`, and set the dashboard's \`tags\` in \`${MAIN_FILE}\` to the tags' IDs.
`;
  }
  return `
\`${TAGS_FILE}\` creates the dashboard's tags (${count}) as new tags, and the dashboard refers to them.
The tags file requires the Kibana Terraform applies to to be ${minKibanaVersion} or later, and Kibana
refuses a tag whose name already exists. If the target is older, or already has tags with these names,
delete \`${TAGS_FILE}\` and set the dashboard's \`tags\` in \`${MAIN_FILE}\` to the IDs of existing tags.
The tags are created in the dashboard's space; if you set a \`space_id\` on the dashboard, set the same on each tag.
`;
};

const readme = (
  { source, version }: DashboardTerraformResponseBody['provider'],
  mode: ExportMode,
  tagCount: number,
  dataViewCount: number,
  minKibanaVersion: string,
  dataViewResourceType: string
) => `# Dashboard exported from Kibana

${firstPlan(mode, 1 + tagCount + dataViewCount)}
${tagsSection(mode, tagCount, minKibanaVersion)}${dataViewsSection(
  mode,
  dataViewCount,
  dataViewResourceType
)}
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
    body,
    provider,
    resource_type: resourceType,
    resource_name: resourceName,
    tag_resource: tagResource,
    data_view_resource: dataViewResource,
  } = conversion;
  const tags = exportedTags(conversion);
  const dataViews = exportedDataViews(conversion);
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
                  tags.map((tag) => [tag.name, tagResourceBody(tag, mode)])
                ),
              },
            }),
          },
        ]
      : []),
    ...(dataViews.length
      ? [
          {
            name: DATA_VIEWS_FILE,
            language: 'json' as const,
            content: json({
              resource: {
                [dataViewResource.type]: Object.fromEntries(
                  dataViews.map((dataView) => [
                    dataView.name,
                    dataViewResourceBody(dataView, conversion, mode),
                  ])
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
                ...[...tags, ...dataViews].map(({ type, name, id }) => ({
                  to: `${type}.${name}`,
                  id: escapeTemplate(`${mode.spaceId}/${id}`),
                })),
              ],
            }),
          },
        ]
      : []),
    {
      name: 'README.md',
      language: 'markdown',
      content: readme(
        provider,
        mode,
        tags.length,
        dataViews.length,
        tagResource.min_kibana_version,
        dataViewResource.type
      ),
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
