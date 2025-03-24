/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { getDocLinks, getDocLinksMeta } from '@kbn/doc-links';
import type { DocLinksServiceStart, DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { DocLinksService } from '@kbn/core-doc-links-server-internal';

expect.addSnapshotSerializer({
  test: (val) => val instanceof MockLinkContext,
  serialize: (val: MockLinkContext) => {
    return val.toString();
  },
});

type DocLinksServiceContract = PublicMethodsOf<DocLinksService>;

export class MockLinkContext {
  private readonly path: string[] = [];
  constructor(private readonly root: string) {}

  public addKey(key: string) {
    this.path.push(key);
    return this;
  }

  public toString = () => {
    return `https://mock-docs.elastic.test/#${this.root}${
      this.path.length ? '.' + this.path.join('.') : ''
    }`;
  };
}

function assertString(val: unknown): asserts val is string {
  if (typeof val !== 'string') throw new Error(`received "${typeof val}", expected "string"`);
}

function createMockLinkGetter(rootKey: string) {
  const ctx = new MockLinkContext(rootKey);
  return new Proxy(ctx, {
    get(_, key) {
      if (key === 'toString') {
        return ctx.toString;
      }
      assertString(key);
      return ctx.addKey(key);
    },
  });
}

const createSetupMock = (): DocLinksServiceSetup => {
  const branch = 'test-branch';
  const buildFlavor = 'traditional';

  const links = new Proxy(
    {},
    {
      get: (_, rootKey) => {
        assertString(rootKey);
        return createMockLinkGetter(rootKey);
      },
    }
  );

  return {
    ...getDocLinksMeta({ kibanaBranch: branch, buildFlavor }),
    links: links as ReturnType<typeof getDocLinks>,
  };
};

const createStartMock = (): DocLinksServiceStart => {
  return createSetupMock();
};

const createServiceMock = (): jest.Mocked<DocLinksServiceContract> => {
  return {
    setup: jest.fn().mockImplementation(createSetupMock),
    start: jest.fn().mockImplementation(createStartMock),
  };
};

/**
 * @remark the `links` object in these mocks returns an object mocking the
 *         entire {@link DocLinks} object.
 *
 *         The side effect of this mocking is that all real doc links are substituted
 *         with a mock link intended for developers to confirm in snapshots that
 *         they are accessing the doc link they expect, not that the concrete link
 *         is what they expect.
 *
 * @example
 * ```ts
 * const myLink = docLinks.links.myAwesomeLink.livesHere
 * // In mocks will be something like https://docs.elastic.test/#myAwesomeLink.livesHere
 * // Outside of mocks will be the concrete, expected link
 * ```
 */
export const docLinksServiceMock = {
  create: createServiceMock,
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
};
