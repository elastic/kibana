/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import * as fixtures from '../../__tests__/fixtures';
import { ESQLProperNode } from '../../types';
import { Walker } from '../../walker';

/**
 * Asserts that a node has all {@link AstNodeParserFields} defined.
 */
const assertNodeParserFields = (query: EsqlQuery, node: ESQLProperNode): void => {
  try {
    expect(typeof node.location).toBe('object');
    expect(typeof node.location.min).toBe('number');
    expect(typeof node.location.max).toBe('number');
    expect(node.location.min >= 0).toBe(true);
    expect(node.location.max > 0).toBe(true);
    expect(node.location.max <= query.src.length).toBe(true);
    expect(typeof node.text).toBe('string');
    if (node.location.min !== node.location.max) {
      expect(node.text.length > 0).toBe(true);
    }
    expect(typeof node.incomplete).toBe('boolean');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(node);
    throw error;
  }
};

const assertQueryParserFields = (src: string): void => {
  const query = EsqlQuery.fromSrc(src);

  Walker.visitAny(query.ast, (node) => {
    assertNodeParserFields(query, node);
  });
};

describe('all nodes have ParserFields defined', () => {
  it('simple query', () => {
    assertQueryParserFields(fixtures.smallest);
  });

  it('large query', () => {
    assertQueryParserFields(fixtures.large);
  });
});
