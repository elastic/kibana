/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';
import { NotFoundErrors } from './not_found_errors';
import { docLinksServiceMock } from '@kbn/core/public/mocks';

describe('NotFoundErrors component', () => {
  const mountError = (type: string) =>
    mount(
      <I18nProvider>
        <NotFoundErrors type={type} docLinks={docLinksServiceMock.createStartContract().links} />
      </I18nProvider>
    ).find('NotFoundErrors');

  it('renders correctly for search type', () => {
    const mounted = mountError('search');
    const callOut = mounted.find('EuiCallOut');
    expect(callOut).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectThe saved search associated with this object no longer exists.If you know what this error means, you can use the Saved objects APIsExternal link(opens in a new tab or window) to fix it — otherwise click the delete button above."`
    );
  });

  it('renders correctly for index-pattern type', () => {
    const mounted = mountError('index-pattern');
    const callOut = mounted.find('EuiCallOut');
    expect(callOut).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectThe data view associated with this object no longer exists.If you know what this error means, you can use the Saved objects APIsExternal link(opens in a new tab or window) to fix it — otherwise click the delete button above."`
    );
  });

  it('renders correctly for index-pattern-field type', () => {
    const mounted = mountError('index-pattern-field');
    const callOut = mounted.find('EuiCallOut');
    expect(callOut).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectA field associated with this object no longer exists in the data view.If you know what this error means, you can use the Saved objects APIsExternal link(opens in a new tab or window) to fix it — otherwise click the delete button above."`
    );
  });

  it('renders correctly for unknown type', () => {
    const mounted = mountError('unknown');
    const callOut = mounted.find('EuiCallOut');
    expect(callOut).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectIf you know what this error means, you can use the Saved objects APIsExternal link(opens in a new tab or window) to fix it — otherwise click the delete button above."`
    );
  });
});
