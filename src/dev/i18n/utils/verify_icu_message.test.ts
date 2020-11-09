/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

    expect(() => verifyICUMessage(message)).toThrowError();
  });

  it('throws on missing curly brackets', () => {
    const message = `A missing {curly`;

    expect(() => verifyICUMessage(message)).toThrowError();
  });

  it('throws on incorrect plural icu-syntax', () => {
    // Notice that small/Medium/Large constants are swapped with the translation strings.
    const message =
      '{textScale, select, small {小さい} 中くらい {Medium} 大きい {Large} その他の {{textScale}} }';

    expect(() => verifyICUMessage(message)).toThrowError();
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
