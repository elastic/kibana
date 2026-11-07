/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { OasDocument, OasSchema } from './oas_model';
import { ROOT_COMPONENT, SECTION_COMPONENT } from './oas_model';

/** Where the dashboard slice of the published OpenAPI file is checked in, relative to the package root. */
export const DASHBOARD_OAS_FILE = 'src/dashboard_schemas.oas.json';

const REF = /"\$ref":"#\/components\/schemas\/([^"]+)"/g;

const referencedComponents = (schema: OasSchema): string[] =>
  [...JSON.stringify(schema).matchAll(REF)].map(([, name]) => name);

/** The dashboard and section components of an OpenAPI document and every component they reference. */
export const extractDashboardOas = (doc: OasDocument): OasDocument => {
  const { schemas } = doc.components;
  const names = new Set<string>();
  const visit = (name: string) => {
    if (names.has(name)) return;
    const schema = schemas[name];
    if (!schema) throw new Error(`The OpenAPI document has no component ${name}`);
    names.add(name);
    referencedComponents(schema).forEach(visit);
  };
  visit(ROOT_COMPONENT);
  visit(SECTION_COMPONENT);
  const sorted: Record<string, OasSchema> = {};
  for (const name of [...names].sort()) sorted[name] = schemas[name];
  return { components: { schemas: sorted } };
};

/** The dashboard slice of Kibana's published OpenAPI file, as checked in with this package. */
export const loadDashboardOas = async (): Promise<OasDocument> =>
  JSON.parse(await readFile(join(__dirname, '..', DASHBOARD_OAS_FILE), 'utf8'));
