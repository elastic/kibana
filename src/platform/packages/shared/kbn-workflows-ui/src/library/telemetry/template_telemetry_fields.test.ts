/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template, TemplateBody } from '@kbn/workflows-library';
import { getTemplateTelemetryFields } from './template_telemetry_fields';

const buildTemplate = (metadata: Partial<TemplateBody['metadata']> = {}): TemplateBody => ({
  metadata: {
    slug: 'triage-alerts',
    version: '1.2.0',
    availability: '>=9.5.0',
    name: 'Triage alerts',
    description: 'Triage.',
    categories: [],
    ...metadata,
  },
  body: { steps: [] },
  raw: '',
});

const CATALOG = [
  { slug: 'triage-alerts', version: '1.2.0', solutions: ['security'] },
  { slug: 'cross-solution', version: '2.0.0' },
] as Template[];

describe('getTemplateTelemetryFields', () => {
  it('describes a catalog template with its own metadata', () => {
    expect(
      getTemplateTelemetryFields(buildTemplate({ solutions: ['security'] }), 'catalog', undefined)
    ).toEqual({
      templateSlug: 'triage-alerts',
      templateVersion: '1.2.0',
      templateOrigin: 'catalog',
      solutions: ['security'],
    });
  });

  it('sends empty solutions for a cross-solution catalog template', () => {
    expect(getTemplateTelemetryFields(buildTemplate(), 'catalog', undefined)).toMatchObject({
      solutions: [],
    });
  });

  it('describes an imported file the catalog lists with the catalog row', () => {
    expect(getTemplateTelemetryFields(buildTemplate(), 'import', CATALOG)).toEqual({
      templateSlug: 'triage-alerts',
      templateVersion: '1.2.0',
      templateOrigin: 'import',
      solutions: ['security'],
    });
    expect(
      getTemplateTelemetryFields(
        buildTemplate({ slug: 'cross-solution', version: '2.0.0' }),
        'import',
        CATALOG
      )
    ).toMatchObject({ templateSlug: 'cross-solution', solutions: [] });
  });

  it('drops the version of an imported file that differs from the catalog', () => {
    expect(
      getTemplateTelemetryFields(buildTemplate({ version: '9.9.9-mine' }), 'import', CATALOG)
    ).toEqual({
      templateSlug: 'triage-alerts',
      templateOrigin: 'import',
      solutions: ['security'],
    });
  });

  it('sends `custom` for an imported file the catalog does not list', () => {
    expect(
      getTemplateTelemetryFields(
        buildTemplate({ slug: 'acme-escalation', solutions: ['security'] }),
        'import',
        CATALOG
      )
    ).toEqual({ templateSlug: 'custom', templateOrigin: 'import' });
  });

  it('sends `unresolved` for an imported file when the browser has no catalog', () => {
    expect(getTemplateTelemetryFields(buildTemplate(), 'import', undefined)).toEqual({
      templateSlug: 'unresolved',
      templateOrigin: 'import',
    });
  });
});
