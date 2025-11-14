/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFixtureTemplate } from './create_fixture_template';

function mkModelVersion(props: Array<{ path: string[]; type: any }>) {
  return {
    schemas: {
      create: {
        getSchemaStructure: () => props,
      },
    },
  } as any;
}

describe('createFixtureTemplate', () => {
  it('creates fixture for a single root property', () => {
    const props = [{ path: ['title'], type: 'text' }];
    const modelVersion = mkModelVersion(props);
    expect(createFixtureTemplate(modelVersion)).toEqual({ title: 'text' });
  });

  it('creates fixture for a nested property (2 levels)', () => {
    const props = [{ path: ['meta', 'author'], type: 'keyword' }];
    const modelVersion = mkModelVersion(props);
    expect(createFixtureTemplate(modelVersion)).toEqual({ meta: { author: 'keyword' } });
  });

  it('creates fixture for a deep nested property (3 levels)', () => {
    const props = [{ path: ['a', 'b', 'c'], type: 'number' }];
    const modelVersion = mkModelVersion(props);
    expect(createFixtureTemplate(modelVersion)).toEqual({ a: { b: { c: 'number' } } });
  });

  it('merges multiple properties that share parents', () => {
    const props = [
      { path: ['meta', 'author'], type: 'keyword' },
      { path: ['meta', 'date'], type: 'date' },
      { path: ['meta', 'nested', 'id'], type: 'uuid' },
    ];
    const modelVersion = mkModelVersion(props);
    expect(createFixtureTemplate(modelVersion)).toEqual({
      meta: {
        author: 'keyword',
        date: 'date',
        nested: {
          id: 'uuid',
        },
      },
    });
  });

  it('works regardless of property order', () => {
    const props = [
      { path: ['meta', 'nested', 'id'], type: 'uuid' },
      { path: ['meta', 'author'], type: 'keyword' },
      { path: ['meta', 'date'], type: 'date' },
    ];
    const modelVersion = mkModelVersion(props);
    expect(createFixtureTemplate(modelVersion)).toEqual({
      meta: {
        nested: {
          id: 'uuid',
        },
        author: 'keyword',
        date: 'date',
      },
    });
  });

  it('can create sample templates from SO schemas, e.g. dashboards', () => {
    const props = [
      {
        path: ['title'],
        type: 'string',
      },
      {
        path: ['description'],
        type: 'string?',
      },
      {
        path: ['kibanaSavedObjectMeta', 'searchSourceJSON'],
        type: 'string?',
      },
      {
        path: ['timeRestore'],
        type: 'boolean?',
      },
      {
        path: ['timeFrom'],
        type: 'string?',
      },
      {
        path: ['timeTo'],
        type: 'string?',
      },
      {
        path: ['refreshInterval', 'pause'],
        type: 'boolean',
      },
      {
        path: ['refreshInterval', 'value'],
        type: 'number',
      },
      {
        path: ['refreshInterval', 'display'],
        type: 'string?',
      },
      {
        path: ['refreshInterval', 'section'],
        type: 'number?',
      },
      {
        path: ['controlGroupInput', 'panelsJSON'],
        type: 'string?',
      },
      {
        path: ['controlGroupInput', 'controlStyle'],
        type: 'string?',
      },
      {
        path: ['controlGroupInput', 'chainingSystem'],
        type: 'string?',
      },
      {
        path: ['controlGroupInput', 'ignoreParentSettingsJSON'],
        type: 'string?',
      },
      {
        path: ['controlGroupInput', 'showApplySelections'],
        type: 'boolean?',
      },
      {
        path: ['panelsJSON'],
        type: 'string?',
      },
      {
        path: ['optionsJSON'],
        type: 'string?',
      },
      {
        path: ['hits'],
        type: 'number?',
      },
      {
        path: ['version'],
        type: 'number?',
      },
      {
        path: ['sections'],
        type: 'array?',
      },
    ];
    const modelVersion = mkModelVersion(props);

    expect(createFixtureTemplate(modelVersion)).toEqual({
      title: 'string',
      description: 'string?',
      kibanaSavedObjectMeta: {
        searchSourceJSON: 'string?',
      },
      timeRestore: 'boolean?',
      timeFrom: 'string?',
      timeTo: 'string?',
      refreshInterval: {
        pause: 'boolean',
        value: 'number',
        display: 'string?',
        section: 'number?',
      },
      controlGroupInput: {
        panelsJSON: 'string?',
        controlStyle: 'string?',
        chainingSystem: 'string?',
        ignoreParentSettingsJSON: 'string?',
        showApplySelections: 'boolean?',
      },
      panelsJSON: 'string?',
      optionsJSON: 'string?',
      hits: 'number?',
      version: 'number?',
      sections: 'array?',
    });
  });
});
