/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { docLinksServiceMock, MockLinkContext } from './doc_links_service.mock';

expect.addSnapshotSerializer({
  test: (val) => val instanceof MockLinkContext,
  serialize: (val: MockLinkContext) => {
    return val.toString();
  },
});

describe('docLinksServiceMock', () => {
  describe('createSetupContract links', () => {
    let contract: ReturnType<typeof docLinksServiceMock.createSetupContract>;
    beforeEach(() => {
      contract = docLinksServiceMock.createSetupContract();
    });
    it('`toMatchInlineSnapshot`', () => {
      expect(contract.links.alerting.emailExchangeClientSecretConfig).toMatchInlineSnapshot(
        `https://docs.elastic.test/#alerting.emailExchangeClientSecretConfig`
      );
    });
    it('`toMatchSnapshot`', () => {
      expect(contract.links.alerting.emailExchangeClientSecretConfig).toMatchSnapshot();
    });
    it('toEqual', () => {
      expect(String(contract.links.alerting.emailExchangeClientSecretConfig)).toEqual('https://docs.elastic.test/#alerting.emailExchangeClientSecretConfig');
    });
    it('toBe', () => {
      expect(String(contract.links.alerting.emailExchangeClientSecretConfig)).toBe('https://docs.elastic.test/#alerting.emailExchangeClientSecretConfig');
    });
    it('can be called multiple times', () => {
      expect(String(contract.links.alerting.emailExchangeClientSecretConfig)).toBe('https://docs.elastic.test/#alerting.emailExchangeClientSecretConfig');
      expect(String(contract.links.aggs.cardinality)).toBe('https://docs.elastic.test/#aggs.cardinality');
    });
  });
});
