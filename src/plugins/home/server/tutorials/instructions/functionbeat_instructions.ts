/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

i18n.translate('home.tutorials.common.functionbeatInstructions.install.osxTitle', {
  defaultMessage: 'Download and install Functionbeat <a>',
  ignoreTag: true,
  description: 'some description',
  values: {
    myVar: 'asdf',
  }
});

import {createIntl} from '@formatjs/intl'


const intl = createIntl(
  {
    locale: 'fr-FR',
    messages: {},
  },
)


intl.formatMessage({
  id: 'valid_id',
  defaultMessage: 'fully_valid',
  description: 'some description',
}, { myValid: 'omomo', })