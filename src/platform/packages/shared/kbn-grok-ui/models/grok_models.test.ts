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

  describe('Field colour assignment', () => {
    let collection: GrokCollection;

    const PALETTE = [
      'Primary',
      'Accent',
      'AccentSecondary',
      'Neutral',
      'Success',
      'Warning',
      'Risk',
      'Danger',
    ] as const;

    const colourFor = (expression: DraftGrokExpression, fieldName: string): string | undefined => {
      for (const fieldDef of expression.getFields().values()) {
        if (fieldDef.name === fieldName) return fieldDef.colour;
      }
      return undefined;
    };

    beforeEach(async () => {
      // Use a fresh collection so prior tests don't leak into the field colour map.
      collection = new GrokCollection();
      await collection.setup();
    });

    it('returns the same colour for the same field name across resolves of the same pattern', () => {
      const expression = new DraftGrokExpression(collection, '%{NUMBER:foo}');
      const firstColour = colourFor(expression, 'foo');
      expect(firstColour).toBeDefined();

      // Force the pattern to resolve again (simulates an external update of the same value).
      expression.updateExpression('%{NUMBER:foo}');
      expect(colourFor(expression, 'foo')).toBe(firstColour);
    });

    it('shares the same colour for the same field name across multiple patterns', () => {
      // Two patterns referencing the same field share one colour — preventing collisions of
      // identical fields across rows in the grok processor editor.
      const a = new DraftGrokExpression(collection, '%{NUMBER:status} %{WORD:method}');
      const b = new DraftGrokExpression(collection, '%{NUMBER:status} %{GREEDYDATA:message}');
      expect(colourFor(a, 'status')).toBe(colourFor(b, 'status'));
    });

    it('adopts an existing field colour when typing reaches a name already used on another row', () => {
      const row1 = new DraftGrokExpression(
        collection,
        '%{WORD:custom.timestamp} %{WORD:host.hostname}',
        {
          patternSlotId: 0,
        }
      );
      const row2 = new DraftGrokExpression(
        collection,
        '%{WORD:custom.timestamp} %{WORD:process.name}',
        {
          patternSlotId: 1,
        }
      );
      const sharedColour = colourFor(row1, 'custom.timestamp');
      expect(sharedColour).toBeDefined();
      expect(colourFor(row2, 'custom.timestamp')).toBe(sharedColour);

      const row3 = new DraftGrokExpression(
        collection,
        '%{GREEDYDATA:message} %{WORD:host.hostname}',
        {
          patternSlotId: 2,
        }
      );
      const messageColour = colourFor(row3, 'message');
      expect(messageColour).toBeDefined();

      // Row 3 renames its first field to match rows 1 & 2, letter by letter (slot anchor was messageColour).
      row3.updateExpression('%{WORD:custom.timestam} %{WORD:host.hostname}');
      row3.updateExpression('%{WORD:custom.timestamp} %{WORD:host.hostname}');

      expect(colourFor(row3, 'custom.timestamp')).toBe(sharedColour);
      expect(colourFor(row3, 'custom.timestamp')).not.toBe(messageColour);
      expect(colourFor(row1, 'custom.timestamp')).toBe(sharedColour);
    });

    it('assigns distinct colours to distinct field names within the palette size', () => {
      const a = new DraftGrokExpression(collection, '%{NUMBER:a}');
      const b = new DraftGrokExpression(collection, '%{NUMBER:b}');
      expect(colourFor(a, 'a')).not.toBe(colourFor(b, 'b'));
    });

    it('keeps the colour stable while typing the same field (regression: per-keystroke churn)', () => {
      const expression = new DraftGrokExpression(collection, '%{NUMBER:f}');
      const stableColour = colourFor(expression, 'f');
      expect(stableColour).toBeDefined();

      expression.updateExpression('%{NUMBER:fo}');
      expect(colourFor(expression, 'fo')).toBe(stableColour);

      expression.updateExpression('%{NUMBER:foo}');
      expect(colourFor(expression, 'foo')).toBe(stableColour);

      expression.updateExpression('%{NUMBER:fooz}');
      expect(colourFor(expression, 'fooz')).toBe(stableColour);
    });

    it('reuses a freed palette slot when one field is renamed while another is unchanged', () => {
      const expression = new DraftGrokExpression(collection, '%{NUMBER:status} %{WORD:method}');
      const statusColour = colourFor(expression, 'status');
      const methodColour = colourFor(expression, 'method');
      expect(statusColour).not.toBe(methodColour);

      expression.updateExpression('%{NUMBER:status} %{WORD:m}');
      expect(colourFor(expression, 'status')).toBe(statusColour);
      expect(colourFor(expression, 'm')).toBe(methodColour);

      expression.updateExpression('%{NUMBER:status} %{WORD:meth}');
      expect(colourFor(expression, 'status')).toBe(statusColour);
      expect(colourFor(expression, 'meth')).toBe(methodColour);
    });

    it('frees a colour slot when a draft is destroyed and the next fresh field rotates to a new colour', () => {
      const a = new DraftGrokExpression(collection, '%{NUMBER:foo}');
      const fooColour = colourFor(a, 'foo');
      expect(fooColour).toBeDefined();
      expect(PALETTE).toContain(fooColour as (typeof PALETTE)[number]);

      a.destroy();

      const b = new DraftGrokExpression(collection, '%{NUMBER:bar}');
      const barColour = colourFor(b, 'bar');
      expect(barColour).toBeDefined();
      expect(PALETTE).toContain(barColour as (typeof PALETTE)[number]);
      expect(barColour).not.toBe(fooColour);
    });

    it('rotates to a new colour when the field is deleted then retyped under a different name (regression: delete-then-retype)', () => {
      const editor = new DraftGrokExpression(collection, '%{IP:foo}', { patternSlotId: 0 });
      const preview = new DraftGrokExpression(collection, '%{IP:foo}', { patternSlotId: 0 });
      const fooColour = colourFor(editor, 'foo');
      expect(fooColour).toBeDefined();
      expect(colourFor(preview, 'foo')).toBe(fooColour);

      // Step 1: clear the field name. `%{IP:}` does not register a semantic field, so the
      // post-update flush drops `foo` from the colour map once neither draft references it.
      editor.updateExpression('%{IP:}');
      preview.updateExpression('%{IP:}');

      // Step 2: type a brand-new name in a follow-up edit. There is no in-flight release
      // for reconcile to transfer from, so getColour rotates to the next palette slot.
      editor.updateExpression('%{IP:bar}');
      preview.updateExpression('%{IP:bar}');

      const barColour = colourFor(editor, 'bar');
      expect(barColour).toBeDefined();
      expect(PALETTE).toContain(barColour as (typeof PALETTE)[number]);
      expect(barColour).not.toBe(fooColour);
      expect(colourFor(preview, 'bar')).toBe(barColour);
    });

    it('assigns distinct colours to each field when a row replaces all its fields in one edit (regression: multi-field rename)', () => {
      const row = new DraftGrokExpression(collection, '%{NUMBER:a} %{WORD:b}', {
        patternSlotId: 0,
      });
      const aColour = colourFor(row, 'a');
      const bColour = colourFor(row, 'b');
      expect(aColour).toBeDefined();
      expect(bColour).toBeDefined();
      expect(aColour).not.toBe(bColour);

      row.updateExpression('%{NUMBER:c} %{WORD:d}');

      const cColour = colourFor(row, 'c');
      const dColour = colourFor(row, 'd');
      expect(cColour).toBeDefined();
      expect(dColour).toBeDefined();
      expect(PALETTE).toContain(cColour as (typeof PALETTE)[number]);
      expect(PALETTE).toContain(dColour as (typeof PALETTE)[number]);
      // The two new fields must land on different palette slots.
      expect(cColour).not.toBe(dColour);
    });

    it('always assigns palette colours and wraps around once the palette is exhausted', () => {
      const drafts = Array.from(
        { length: 10 },
        (_, i) => new DraftGrokExpression(collection, `%{NUMBER:f${i}}`)
      );
      const colours = drafts.map((draft, i) => colourFor(draft, `f${i}`));

      colours.forEach((colour) => {
        expect(colour).toBeDefined();
        expect(PALETTE).toContain(colour as (typeof PALETTE)[number]);
      });

      // The first 8 unique fields advance the rotation cursor through 8 consecutive slots, so
      // they must all be different colours.
      expect(new Set(colours.slice(0, 8)).size).toBe(8);
      // The 9th and 10th wrap back through the rotation, so they reuse the same colours as
      // the 1st and 2nd respectively.
      expect(colours[8]).toBe(colours[0]);
      expect(colours[9]).toBe(colours[1]);
    });

    it('shares colours for manual (?<field>...) capture groups across patterns', () => {
      const a = new DraftGrokExpression(collection, '(?<queueId>[0-9A-F]{10,11})');
      const b = new DraftGrokExpression(collection, '%{WORD:level} (?<queueId>[0-9A-F]{10,11})');
      expect(colourFor(a, 'queueId')).toBe(colourFor(b, 'queueId'));
    });

    it('keeps colours stable while typing a manual (?<field>...) capture group', () => {
      const expression = new DraftGrokExpression(collection, '(?<q>[0-9A-F]+)');
      const stableColour = colourFor(expression, 'q');
      expect(stableColour).toBeDefined();

      expression.updateExpression('(?<qu>[0-9A-F]+)');
      expect(colourFor(expression, 'qu')).toBe(stableColour);

      expression.updateExpression('(?<queueId>[0-9A-F]+)');
      expect(colourFor(expression, 'queueId')).toBe(stableColour);
    });
  });
});
