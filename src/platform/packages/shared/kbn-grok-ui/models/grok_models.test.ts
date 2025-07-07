/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DraftGrokExpression } from './draft_grok_expression';
import { GrokCollection } from './grok_collection_and_pattern';

let grokCollection: GrokCollection;
let draftGrokExpression: DraftGrokExpression;

describe('Grok models', () => {
  beforeAll(async () => {
    grokCollection = new GrokCollection();
    await grokCollection.setup();
    draftGrokExpression = new DraftGrokExpression(grokCollection);
  });

  it('should parse a simple pattern', () => {
    draftGrokExpression.updateExpression('%{NUMBER:bytes} %{NUMBER:response}');
    const parsed = draftGrokExpression.parse(['1234 200']);
    expect(parsed).toEqual([{ bytes: '1234', response: '200' }]);
  });

  it('should parse a pattern with a custom pattern', () => {
    draftGrokExpression.updateExpression(
      '%{NUMBER:bytes} %{LOGLEVEL:level} %{NUMBER:response} (?<queueId>[0-9A-F]{10,11})'
    );
    const parsed = draftGrokExpression.parse(['1234 WARN 200 5555555555']);
    expect(parsed).toEqual([
      { bytes: '1234', level: 'WARN', response: '200', queueId: '5555555555' },
    ]);
  });

  it('Should parse multiple samples', () => {
    draftGrokExpression.updateExpression('%{WORD:test} %{NUMBER:response}');
    const parsed = draftGrokExpression.parse(['Hello 200', 'Another 404']);
    expect(parsed).toEqual([
      { test: 'Hello', response: '200' },
      { test: 'Another', response: '404' },
    ]);
  });

  it('Should parse a pattern using types', () => {
    draftGrokExpression.updateExpression(
      '%{NUMBER:notype} %{NUMBER:bytes:int} %{NUMBER:large:float}'
    );
    const parsed = draftGrokExpression.parse(['578 1234.2323 20034343434.2323']);
    expect(parsed).toEqual([{ notype: '578', bytes: 1234, large: 20034343434.2323 }]);
  });

  it('Should parse a pattern with special characters in the semantic', () => {
    draftGrokExpression.updateExpression('%{WORD:@someword}');
    const parsed = draftGrokExpression.parse(['test']);
    expect(parsed).toEqual([{ '@someword': 'test' }]);
  });

  it('Should support nested semantic names', () => {
    draftGrokExpression.updateExpression(
      '%{WORD:log.level} %{WORD:log.other} %{WORD:log.extra} %{WORD:log.nested.test}'
    );
    const parsed = draftGrokExpression.parse(['level other extra nestedTest']);
    expect(parsed).toEqual([
      { log: { level: 'level', other: 'other', extra: 'extra', nested: { test: 'nestedTest' } } },
    ]);
  });

  describe('Should parse complex patterns', () => {
    it('Example one', () => {
      draftGrokExpression.updateExpression(
        String.raw`^\"(?<rid>[^\"]+)\" \| %{IPORHOST:clientip} (?:-|%{IPORHOST:forwardedfor}) (?:-|%{USER:ident}) (?:-|%{USER:auth}) \[%{HTTPDATE:timestamp}\] \"(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:httpversion})?|-)\" %{NUMBER:response:int} (?:-|%{NUMBER:bytes})`
      );
      const parsed = draftGrokExpression.parse([
        `"uRzbUwp5eZgAAAAaqIAAAAAa" | 5.3.2.1 - - - [24/Feb/2013:13:40:51 +0100] "GET /cpc HTTP/1.1" 302 -`,
        `"URzbTwp5eZgAAAAWlbUAAAAV" | 4.3.2.7 - - - [14/Feb/2013:13:40:47 +0100] "GET /cpc/finish.do?cd=true&mea_d=0&targetPage=%2Fcpc%2F HTTP/1.1" 200 5264`,
        `"URzbUwp5eZgAAAAaqIEAAAAa" | 4.3.2.1 - - - [14/Feb/2013:13:40:51 +0100] "GET /cpc/ HTTP/1.1" 402 -`,
        `"URzbUwp5eZgAAAAWlbYAAAAV" | 4.3.2.1 - - - [14/Feb/2013:13:40:51 +0100] "POST /cpc/ HTTP/1.1" 305 - `,
      ]);

      expect(parsed).toEqual([
        {
          rid: 'uRzbUwp5eZgAAAAaqIAAAAAa',
          clientip: '5.3.2.1',
          timestamp: '24/Feb/2013:13:40:51 +0100',
          verb: 'GET',
          request: '/cpc',
          httpversion: '1.1',
          response: 302,
        },
        {
          rid: 'URzbTwp5eZgAAAAWlbUAAAAV',
          clientip: '4.3.2.7',
          timestamp: '14/Feb/2013:13:40:47 +0100',
          verb: 'GET',
          request: '/cpc/finish.do?cd=true&mea_d=0&targetPage=%2Fcpc%2F',
          httpversion: '1.1',
          response: 200,
          bytes: '5264',
        },
        {
          rid: 'URzbUwp5eZgAAAAaqIEAAAAa',
          clientip: '4.3.2.1',
          timestamp: '14/Feb/2013:13:40:51 +0100',
          verb: 'GET',
          request: '/cpc/',
          httpversion: '1.1',
          response: 402,
        },
        {
          rid: 'URzbUwp5eZgAAAAWlbYAAAAV',
          clientip: '4.3.2.1',
          timestamp: '14/Feb/2013:13:40:51 +0100',
          verb: 'POST',
          request: '/cpc/',
          httpversion: '1.1',
          response: 305,
        },
      ]);
    });

    it('Example two', () => {
      draftGrokExpression.updateExpression(
        String.raw`^\[(?<timestamp>%{DAY} %{MONTH} %{MONTHDAY} %{TIME} %{YEAR})\]\s+(\[%{WORD:loglevel}\]\s+)?%{GREEDYDATA:message}`
      );
      const parsed = draftGrokExpression.parse([
        `[Thu Nov 01 21:54:03 2012] [error] [client 1.2.3.4] File does not exist: /usr/local/apache2/htdocs/default/cpc`,
        `[Thu Nov 01 21:56:32 2012] [error] (146)Connection refused: proxy: AJP: attempt to connect to 1.2.3.4:8080 (dev1) failed`,
        `[Thu Nov 01 21:56:32 2012] [error] ap_proxy_connect_backend disabling worker for (dev1)`,
        `[Thu Nov 01 21:56:32 2012] [error] proxy: AJP: failed to make connection to backend: dev1`,
        `[Thu Nov 01 21:56:35 2012] [error] (146)Connection refused: proxy: AJP: attempt to connect to 1.2.3.4:8012 (dev1) failed`,
        `[Thu Nov 01 21:56:35 2012] [error] ap_proxy_connect_backend disabling worker for (dev1)`,
        `[Thu Nov 01 21:56:35 2012] [error] proxy: AJP: failed to make connection to backend: dev1`,
      ]);

      expect(parsed).toEqual([
        {
          timestamp: 'Thu Nov 01 21:54:03 2012',
          loglevel: 'error',
          message: '[client 1.2.3.4] File does not exist: /usr/local/apache2/htdocs/default/cpc',
        },
        {
          timestamp: 'Thu Nov 01 21:56:32 2012',
          loglevel: 'error',
          message:
            '(146)Connection refused: proxy: AJP: attempt to connect to 1.2.3.4:8080 (dev1) failed',
        },
        {
          timestamp: 'Thu Nov 01 21:56:32 2012',
          loglevel: 'error',
          message: 'ap_proxy_connect_backend disabling worker for (dev1)',
        },
        {
          timestamp: 'Thu Nov 01 21:56:32 2012',
          loglevel: 'error',
          message: 'proxy: AJP: failed to make connection to backend: dev1',
        },
        {
          timestamp: 'Thu Nov 01 21:56:35 2012',
          loglevel: 'error',
          message:
            '(146)Connection refused: proxy: AJP: attempt to connect to 1.2.3.4:8012 (dev1) failed',
        },
        {
          timestamp: 'Thu Nov 01 21:56:35 2012',
          loglevel: 'error',
          message: 'ap_proxy_connect_backend disabling worker for (dev1)',
        },
        {
          timestamp: 'Thu Nov 01 21:56:35 2012',
          loglevel: 'error',
          message: 'proxy: AJP: failed to make connection to backend: dev1',
        },
      ]);
    });
  });
});
