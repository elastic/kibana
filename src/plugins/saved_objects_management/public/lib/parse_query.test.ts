/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '@elastic/eui';
import type { SavedObjectManagementTypeInfo } from '../../common';
import { parseQuery } from './parse_query';

const createType = (name: string, displayName?: string): SavedObjectManagementTypeInfo => ({
  name,
  displayName: displayName ?? name,
  hidden: false,
  namespaceType: 'multiple',
});

describe('getQueryText', () => {
  it('parses the query text', () => {
    const query = Query.parse('some search');

    expect(parseQuery(query, [])).toEqual({
      queryText: 'some search',
    });
  });

  it('parses the tags', () => {
    const query = Query.parse('tag:(tag-1 or tag-2) kibana');

    expect(parseQuery(query, [])).toEqual({
      queryText: 'kibana',
      selectedTags: ['tag-1', 'tag-2'],
    });
  });

  it('parses all the fields', () => {
    const query = Query.parse('tag:(tag-1 or tag-2) type:(index-pattern) kibana');

    expect(parseQuery(query, [])).toEqual({
      queryText: 'kibana',
      visibleTypes: ['index-pattern'],
      selectedTags: ['tag-1', 'tag-2'],
    });
  });

  it('does not fail on unknown fields', () => {
    const query = Query.parse('unknown:(hello or dolly) some search');

    expect(parseQuery(query, [])).toEqual({
      queryText: 'some search',
    });
  });

  it('parses the types when provided types are empty', () => {
    const query = Query.parse('type:(index-pattern or dashboard) kibana');

    expect(parseQuery(query, [])).toEqual({
      queryText: 'kibana',
      visibleTypes: ['index-pattern', 'dashboard'],
    });
  });

  it('maps displayName to name when parsing the types', () => {
    const query = Query.parse('type:(i-p or dash) kibana');
    const types = [createType('index-pattern', 'i-p'), createType('dashboard', 'dash')];

    expect(parseQuery(query, types)).toEqual({
      queryText: 'kibana',
      visibleTypes: ['index-pattern', 'dashboard'],
    });
  });

  it('maps displayName to name even when some types are missing', () => {
    const query = Query.parse('type:(i-p or dashboard) kibana');
    const types = [createType('index-pattern', 'i-p')];

    expect(parseQuery(query, types)).toEqual({
      queryText: 'kibana',
      visibleTypes: ['index-pattern', 'dashboard'],
    });
  });
});
