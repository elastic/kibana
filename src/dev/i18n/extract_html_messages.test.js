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

import { extractHtmlMessages } from './extract_html_messages';

const htmlSourceBuffer = Buffer.from(`
<div name="dashboard">
  <div>
    <p
      i18n-id="kbn.dashboard.id-1"
      i18n-default-message="Message text 1"
      i18n-context="Message context 1"
    ></p>
  </div>
  <div>
    {{ 'kbn.dashboard.id-2' | i18n: { defaultMessage: 'Message text 2' } }}
  </div>
  <div>
    {{ 'kbn.dashboard.id-3' | i18n: { defaultMessage: 'Message text 3', context: 'Message context 3' } }}
  </div>
</div>
`);

describe('dev/i18n/extract_html_messages', () => {
  test('extracts default messages from HTML', () => {
    const actual = Array.from(extractHtmlMessages(htmlSourceBuffer));
    expect(actual.sort()).toMatchSnapshot();
  });

  test('throws on empty i18n-id', () => {
    const source = Buffer.from(`\
<p
  i18n-id=""
  i18n-default-message="Message text"
  i18n-context="Message context"
></p>
`);

    expect(() => extractHtmlMessages(source).next()).toThrowErrorMatchingSnapshot();
  });

  test('throws on missing i18n-default-message attribute', () => {
    const source = Buffer.from(`\
<p
  i18n-id="message-id"
></p>
`);

    expect(() => extractHtmlMessages(source).next()).toThrowErrorMatchingSnapshot();
  });
});
