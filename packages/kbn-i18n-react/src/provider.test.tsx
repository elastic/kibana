/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount, shallow } from 'enzyme';
import * as React from 'react';
import { injectI18n } from './inject';
import { I18nProvider } from './provider';
import { i18n } from '@kbn/i18n';

describe('I18nProvider', () => {
  test('throws if i18n is not initialized', () => {
    const ChildrenMock = () => null;

    expect(() =>
      shallow(
        <I18nProvider>
          <ChildrenMock />
        </I18nProvider>
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"kbn-i18n must be initialized before using <I18nProvider />"`
    );
  });

  test('intialized provider properly when i18n.init is called', () => {
    const childrenMock = () => <div />;
    const WithIntl = injectI18n(childrenMock);
    i18n.init({
      locale: 'en-US',
      messages: {
        'my.id': 'mock message',
      },
    });

    const wrapper = mount(
      <I18nProvider>
        <WithIntl />
      </I18nProvider>
    );

    expect(wrapper.find(childrenMock).prop('intl')).toMatchSnapshot();
  });

  test('renders children', () => {
    const ChildrenMock = () => null;

    const wrapper = shallow(
      <I18nProvider>
        <ChildrenMock />
      </I18nProvider>
    );

    expect(wrapper.children()).toMatchSnapshot();
  });

  test('provides with context', () => {
    const childrenMock = () => <div />;
    const WithIntl = injectI18n(childrenMock);

    const wrapper = mount(
      <I18nProvider>
        <WithIntl />
      </I18nProvider>,
      {
        childContextTypes: {
          intl: { formatMessage: jest.fn() },
        },
      }
    );

    expect(wrapper.find(childrenMock).prop('intl')).toMatchSnapshot();
  });
});
