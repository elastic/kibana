/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { expect } from '@kbn/scout/ui';
import type { ScoutPage } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';

export interface ImportedSavedObject {
  id: string;
  type: string;
  title: string;
}

export interface DashboardPanel {
  embeddableConfig?: { enhancements?: { dynamicActions?: { events?: unknown[] } } };
}

export const openDashboard = async (page: ScoutPage, id: string) => {
  await page.gotoApp('dashboards', { hash: `/view/${id}` });
};

export const findImportedSavedObjectId = (
  imported: ImportedSavedObject[],
  type: string,
  title: string
) => {
  const savedObject = imported.find((entry) => entry.type === type && entry.title === title);
  expect(
    savedObject,
    `Saved object "${title}" (${type}) not found in imported objects`
  ).toBeTruthy();
  return savedObject!.id;
};

const readExportEntries = (exportPath: string) => {
  const absolutePath = path.resolve(process.cwd(), exportPath);
  return fs
    .readFileSync(absolutePath, 'utf8')
    .trim()
    .split(/\r?\n\r?\n/)
    .map((line) => JSON.parse(line));
};

const getIndexPatternFromExport = (exportPath: string) => {
  const entries = readExportEntries(exportPath);
  const indexPattern = entries.find((entry) => entry.type === 'index-pattern');
  expect(indexPattern, `Index pattern not found in ${exportPath}`).toBeTruthy();
  return indexPattern as { id: string; attributes: Record<string, unknown> };
};

export const ensureIndexPatternFromExport = async (
  kbnClient: KbnClient,
  spaceId: string,
  exportPath: string
) => {
  const indexPattern = getIndexPatternFromExport(exportPath);
  try {
    await kbnClient.savedObjects.delete({
      type: 'index-pattern',
      id: indexPattern.id,
      space: spaceId,
    });
  } catch {
    // Ignore missing index pattern
  }
  await kbnClient.request({
    method: 'POST',
    path: `/s/${spaceId}/api/saved_objects/index-pattern/${indexPattern.id}`,
    body: { attributes: indexPattern.attributes },
  });
};

export const getDashboardPanels = async (kbnClient: KbnClient, spaceId: string, id: string) => {
  const dashboard = await kbnClient.savedObjects.get<{ panelsJSON?: string }>({
    type: 'dashboard',
    id,
    space: spaceId,
  });
  return JSON.parse(dashboard.attributes?.panelsJSON ?? '[]') as DashboardPanel[];
};
