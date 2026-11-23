/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseTemplateOriginFields, pickTemplateOriginFields } from './pick_template_origin_fields';

describe('pickTemplateOriginFields', () => {
  it('returns template origin fields when present', () => {
    expect(
      pickTemplateOriginFields({
        templateSlug: 'triage-alerts',
        templateVersion: '1.2.0',
        templateOrigin: 'install',
      })
    ).toEqual({
      templateSlug: 'triage-alerts',
      templateVersion: '1.2.0',
      templateOrigin: 'install',
    });
  });

  it('omits null and undefined template origin fields', () => {
    expect(
      pickTemplateOriginFields({
        templateSlug: 'custom',
        templateVersion: null,
        templateOrigin: undefined,
      })
    ).toEqual({ templateSlug: 'custom' });
  });

  it('returns an empty object for a missing source', () => {
    expect(pickTemplateOriginFields(undefined)).toEqual({});
    expect(pickTemplateOriginFields(null)).toEqual({});
  });

  it('ignores unrelated fields on the source', () => {
    const source = {
      templateSlug: 'triage-alerts',
      templateVersion: '1.0.0',
      templateOrigin: 'remix' as const,
      managed: true,
    };
    expect(pickTemplateOriginFields(source)).toEqual({
      templateSlug: 'triage-alerts',
      templateVersion: '1.0.0',
      templateOrigin: 'remix',
    });
  });
});

describe('parseTemplateOriginFields', () => {
  it('reads valid template origin fields from an untyped source', () => {
    expect(
      parseTemplateOriginFields({
        name: 'Triage alerts',
        templateSlug: 'triage-alerts',
        templateVersion: '1.2.0',
        templateOrigin: 'import',
      })
    ).toEqual({
      templateSlug: 'triage-alerts',
      templateVersion: '1.2.0',
      templateOrigin: 'import',
    });
  });

  it('drops values of the wrong type and unknown origins', () => {
    expect(
      parseTemplateOriginFields({
        templateSlug: 42,
        templateVersion: { major: 1 },
        templateOrigin: 'clone',
      })
    ).toEqual({});
  });

  it('returns an empty object for a source without template fields', () => {
    expect(parseTemplateOriginFields({ name: 'Hand-written workflow' })).toEqual({});
    expect(parseTemplateOriginFields(undefined)).toEqual({});
  });
});
