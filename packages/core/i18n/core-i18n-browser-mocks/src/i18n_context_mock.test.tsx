/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { shallow } from 'enzyme';
import React from 'react';
import { I18nProviderMock } from './i18n_context_mock';

describe('I18nProviderMock', () => {
  it('interpolates to default message if present', () => {
    expect(
      shallow(
        <I18nProviderMock>
          <FormattedMessage id="id" defaultMessage="default message" />
        </I18nProviderMock>
      ).html()
    ).toMatchInlineSnapshot(`"default message"`);
  });

  it('interpolates to id if default message is not present', () => {
    expect(
      shallow(
        <I18nProviderMock>
          <FormattedMessage id="id" />
        </I18nProviderMock>
      ).html()
    ).toMatchInlineSnapshot(`"id"`);
  });
});
