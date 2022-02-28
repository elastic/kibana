/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizeLocatorDefinition } from './locator';
import { FilterStateStore } from '../../data/common';

describe('visualize locator', () => {
  let definition: VisualizeLocatorDefinition;

  beforeEach(() => {
    definition = new VisualizeLocatorDefinition();
  });

  it('returns a location for "create" path', async () => {
    const location = await definition.getLocation({});

    expect(location.app).toMatchInlineSnapshot(`"visualize"`);
    expect(location.path).toMatchInlineSnapshot(`"#/create?_g=()&_a=()"`);
    expect(location.state).toMatchInlineSnapshot(`Object {}`);
  });

  it('returns a location for "edit" path', async () => {
    const location = await definition.getLocation({
      visId: 'test',
      vis: {
        title: 'test',
        type: 'test',
        aggs: [],
        params: {},
      },
    });

    expect(location.app).toMatchInlineSnapshot(`"visualize"`);
    expect(location.path).toMatchInlineSnapshot(
      `"#/edit/test?_g=()&_a=(vis:(aggs:!(),params:(),title:test,type:test))&type=test"`
    );
    expect(location.state).toMatchInlineSnapshot(`Object {}`);
  });

  it('creates a location with query, filters (global and app), refresh interval and time range', async () => {
    const location = await definition.getLocation({
      visId: '123',
      vis: {
        title: 'test',
        type: 'test',
        aggs: [],
        params: {},
      },
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      refreshInterval: { pause: false, value: 300 },
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
          $state: {
            store: FilterStateStore.GLOBAL_STATE,
          },
        },
      ],
      query: { query: 'bye', language: 'kuery' },
    });

    expect(location.app).toMatchInlineSnapshot(`"visualize"`);

    expect(location.path.match(/filters:/g)?.length).toBe(2);
    expect(location.path.match(/refreshInterval:/g)?.length).toBe(1);
    expect(location.path.match(/time:/g)?.length).toBe(1);
    expect(location.path).toMatchInlineSnapshot(
      `"#/edit/123?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))&_a=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),query:(language:kuery,query:bye),vis:(aggs:!(),params:(),title:test,type:test))&type=test"`
    );

    expect(location.state).toMatchInlineSnapshot(`Object {}`);
  });

  it('creates a location with all values provided', async () => {
    const indexPattern = 'indexPatternTest';
    const savedSearchId = 'savedSearchIdTest';
    const location = await definition.getLocation({
      visId: '123',
      vis: {
        title: 'test',
        type: 'test',
        aggs: [],
        params: {},
      },
      timeRange: { to: 'now', from: 'now-15m', mode: 'relative' },
      refreshInterval: { pause: false, value: 300 },
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
        },
      ],
      query: { query: 'bye', language: 'kuery' },
      linked: true,
      uiState: {
        fakeUIState: 'fakeUIState',
        this: 'value contains a spaces that should be encoded',
      },
      indexPattern,
      savedSearchId,
    });

    expect(location.app).toMatchInlineSnapshot(`"visualize"`);
    expect(location.path).toContain(indexPattern);
    expect(location.path).toContain(savedSearchId);
    expect(location.path).toMatchInlineSnapshot(
      `"#/edit/123?_g=(filters:!(),refreshInterval:(pause:!f,value:300),time:(from:now-15m,mode:relative,to:now))&_a=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:hi))),linked:!t,query:(language:kuery,query:bye),uiState:(fakeUIState:fakeUIState,this:'value%20contains%20a%20spaces%20that%20should%20be%20encoded'),vis:(aggs:!(),params:(),title:test,type:test))&indexPattern=indexPatternTest&savedSearchId=savedSearchIdTest&type=test"`
    );
    expect(location.state).toMatchInlineSnapshot(`Object {}`);
  });
});
