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

import { translateUsingPseudoLocale } from './pseudo_locale';

describe('translateUsingPseudoLocale()', () => {
  it(`shouldn't translate @I18N@ placeholders`, () => {
    const message = 'Message with a @I18N@value@I18N@ placeholder.';

    expect(translateUsingPseudoLocale(message)).toMatchSnapshot();
  });

  it(`shouldn't translate @I18N@ placeholders with underscore`, () => {
    const message = 'Message with a @I18N@snake_case_value@I18N@ placeholder.';

    expect(translateUsingPseudoLocale(message)).toMatchSnapshot();
  });

  it(`should translate @I18N@ placeholders with wrong reference name`, () => {
    const message = 'Message with a @I18N@non-single-word@I18N@ placeholder.';

    expect(translateUsingPseudoLocale(message)).toMatchSnapshot();
  });
});
