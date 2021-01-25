/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
