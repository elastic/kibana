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

import { extractHandlebarsMessages } from './extract_handlebars_messages';

describe('dev/i18n/extract_handlebars_messages', () => {
  test('extracts handlebars default messages', () => {
    const source = Buffer.from(`\
window.onload = function () {
  (function next() {
    var failure = function () {
      failure = function () {};

      var err = document.createElement('h1');
      err.style['color'] = 'white';
      err.innerText = '{{i18n 'ui.id-1' \
'{"defaultMessage": "Message text", "context": "Message context"}'}}';

      document.body.innerHTML = err.outerHTML;
    }
  }());
};
`);

    const actual = Array.from(extractHandlebarsMessages(source));
    expect(actual).toMatchSnapshot();
  });

  test('throws on wrong number of arguments', () => {
    const source = Buffer.from(`\
window.onload = function () {
  err.innerText = '{{i18n 'ui.id-1'}}';
};
`);

    expect(() => extractHandlebarsMessages(source).next()).toThrowErrorMatchingSnapshot();
  });

  test('throws on wrong properties argument type', () => {
    const source = Buffer.from(`\
window.onload = function () {
  err.innerText = '{{i18n 'ui.id-1' propertiesJSONIdentifier}}';
};
`);

    expect(() => extractHandlebarsMessages(source).next()).toThrowErrorMatchingSnapshot();
  });

  test('throws on empty id', () => {
    const source = Buffer.from(`\
window.onload = function () {
  err.innerText = '{{i18n '' '{"defaultMessage": "Message text", "context": "Message context"}'}}';
};
`);

    expect(() => extractHandlebarsMessages(source).next()).toThrowErrorMatchingSnapshot();
  });

  test('throws on missing defaultMessage property', () => {
    const source = Buffer.from(`\
window.onload = function () {
  err.innerText = '{{i18n 'message-id' '{"context": "Message context"}'}}';
};
`);

    expect(() => extractHandlebarsMessages(source).next()).toThrowErrorMatchingSnapshot();
  });
});
