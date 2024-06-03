/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { verifyICUMessage, checkEnglishOnly } from './verify_icu_message';

describe('verifyICUMessage', () => {
  it('passes on plain text', () => {
    const message = 'plain text here';
    expect(() => verifyICUMessage(message)).not.toThrowError();
  });

  it('passes on empty string', () => {
    const message = '';
    expect(() => verifyICUMessage(message)).not.toThrowError();
  });

  it('passes on variable icu-syntax', () => {
    const message = 'Your regular {foobar}';
    expect(() => verifyICUMessage(message)).not.toThrowError();
  });

  it('passes on correct plural icu-syntax', () => {
    const message = `You have {itemCount, plural,
      =0 {no items}
      one {1 item}
      other {{itemCount} items}
    }.`;

    expect(() => verifyICUMessage(message)).not.toThrowError();
  });

  it('throws on malformed string', () => {
    const message =
      'CDATA[extended_bounds設定を使用すると、強制的にヒストグラムアグリゲーションを実行し、特定の最小値に対してバケットの作成を開始し、最大値までバケットを作成し続けます。 ]]></target>\n\t\t\t<note>Kibana-SW - String "data.search.aggs.buckets.dateHistogram.extendedBounds.help" in Json.Root "messages\\strings" ';

    expect(() => verifyICUMessage(message)).toThrowErrorMatchingInlineSnapshot(`
      "UNMATCHED_CLOSING_TAG:
      CDATA[extended_bounds設定を使用すると、強制的にヒストグラムアグリゲーションを実行し、特定の最小値に対してバケットの作成を開始し、最大値までバケットを作成し続けます。 ]]>[37m[41m<[49m[39m/target>
      			<note>Kibana-SW - String \\"data.search.aggs.buckets.dateHistogram.extendedBounds.help\\" in Json.Root \\"messages\\\\strings\\" "
    `);
  });

  it('throws on missing curly brackets', () => {
    const message = `A missing {curly`;

    expect(() => verifyICUMessage(message)).toThrowErrorMatchingInlineSnapshot(`
      "EXPECT_ARGUMENT_CLOSING_BRACE:
      A missing [37m[41m{[49m[39mcurly"
    `);
  });

  it('throws on incorrect plural icu-syntax', () => {
    // Notice that small/Medium/Large constants are swapped with the translation strings.
    const message =
      '{textScale, select, small {小さい} 中くらい {Medium} 大きい {Large} その他の {{textScale}} }';

    expect(() => verifyICUMessage(message)).toThrowErrorMatchingInlineSnapshot(`
      "MISSING_OTHER_CLAUSE:
      {textScale, select, small {小さい} 中くらい {Medium} 大きい {Large} その他の {{textScale}} [37m[41m}[49m[39m"
    `);
  });

  it('throws on non-english select icu-syntax', () => {
    // Notice that small/Medium/Large constants are swapped with the translation strings.
    const message =
      '{textScale, select, small {小さい} 中くらい {Medium} other {Large} その他の {{textScale}} }';

    expect(() => verifyICUMessage(message)).toThrowErrorMatchingInlineSnapshot(`
      "English only selector required. selectFormat options must be in english, got 中くらい:
      [37m[41m{[49m[39mtextScale, select, small {小さい} 中くらい {Medium} other {Large} その他の {{textScale}} }"
    `);
  });
});

describe('checkEnglishOnly', () => {
  it('returns true on english only message', () => {
    const result = checkEnglishOnly('english');

    expect(result).toEqual(true);
  });
  it('returns true on empty message', () => {
    const result = checkEnglishOnly('');

    expect(result).toEqual(true);
  });
  it('returns false on message containing numbers', () => {
    const result = checkEnglishOnly('english 123');

    expect(result).toEqual(false);
  });
  it('returns false on message containing non-english alphabets', () => {
    const result = checkEnglishOnly('i am 大きい');

    expect(result).toEqual(false);
  });
});
