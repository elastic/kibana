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

import { extractPugMessages } from './pug';

const report = jest.fn();

describe('dev/i18n/extractors/pug', () => {
  beforeEach(() => {
    report.mockClear();
  });

  test('extracts messages from pug template with interpolation', () => {
    const source = Buffer.from(`\
#{i18n('message-id', { defaultMessage: 'Default message', description: 'Message description' })}
`);
    const [messageObject] = extractPugMessages(source);

    expect(messageObject).toMatchSnapshot();
  });

  test('extracts messages from pug template without interpolation', () => {
    const source = Buffer.from(`\
.kibanaWelcomeText(data-error-message=i18n('message-id', { defaultMessage: 'Default message', description: 'Message description' }))
`);
    const [messageObject] = extractPugMessages(source);

    expect(messageObject).toMatchSnapshot();
  });

  test('throws on empty id', () => {
    const source = Buffer.from(`\
h1= i18n('', { defaultMessage: 'Default message', description: 'Message description' })
`);

    expect(() => extractPugMessages(source, { report }).next()).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });

  test('throws on missing default message', () => {
    const source = Buffer.from(`\
#{i18n('message-id', { description: 'Message description' })}
`);

    expect(() => extractPugMessages(source, { report }).next()).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });
});
