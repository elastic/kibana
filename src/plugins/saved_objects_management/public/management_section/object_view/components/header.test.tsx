/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import { Header } from './header';

describe('Intro component', () => {
  const mountHeader = (props: {
    canEdit: boolean;
    canDelete: boolean;
    canViewInApp: boolean;
    type: string;
    viewUrl: string;
    onDeleteClick: () => void;
  }) =>
    mount(
      <I18nProvider>
        <Header {...props} />
      </I18nProvider>
    ).find('Header');

  const defaultProps = {
    type: 'search',
    canEdit: true,
    canDelete: true,
    canViewInApp: true,
    viewUrl: '/some-url',
    onDeleteClick: () => undefined,
  };

  it('renders correctly', () => {
    const mounted = mountHeader({
      ...defaultProps,
    });
    expect(mounted).toMatchSnapshot();
  });

  it('displays correct title depending on canEdit', () => {
    let mounted = mountHeader({
      ...defaultProps,
      canEdit: true,
    });
    expect(mounted.find('h1').text()).toMatchInlineSnapshot(`"Edit search"`);

    mounted = mountHeader({
      ...defaultProps,
      canEdit: false,
    });
    expect(mounted.find('h1').text()).toMatchInlineSnapshot(`"View search"`);
  });

  it('displays correct title depending on type', () => {
    let mounted = mountHeader({
      ...defaultProps,
      type: 'some-type',
    });
    expect(mounted.find('h1').text()).toMatchInlineSnapshot(`"Edit some-type"`);

    mounted = mountHeader({
      ...defaultProps,
      type: 'another-type',
    });
    expect(mounted.find('h1').text()).toMatchInlineSnapshot(`"Edit another-type"`);
  });

  it('only displays delete button if canDelete is true', () => {
    let mounted = mountHeader({
      ...defaultProps,
      canDelete: true,
    });
    expect(mounted.exists(`button[data-test-subj='savedObjectEditDelete']`)).toBe(true);

    mounted = mountHeader({
      ...defaultProps,
      canDelete: false,
    });
    expect(mounted.exists(`button[data-test-subj='savedObjectEditDelete']`)).toBe(false);
  });

  it('calls onDeleteClick when clicking on the delete button', () => {
    const clickHandler = jest.fn();

    const mounted = mountHeader({
      ...defaultProps,
      canDelete: true,
      onDeleteClick: clickHandler,
    });
    expect(clickHandler).toHaveBeenCalledTimes(0);

    mounted.find(`button[data-test-subj='savedObjectEditDelete']`).simulate('click');
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  it('only displays view button if canViewInApp is true', () => {
    let mounted = mountHeader({
      ...defaultProps,
      canViewInApp: true,
    });
    expect(mounted.exists(`a[data-test-subj='savedObjectEditViewInApp']`)).toBe(true);

    mounted = mountHeader({
      ...defaultProps,
      canViewInApp: false,
    });
    expect(mounted.exists(`a[data-test-subj='savedObjectEditViewInApp']`)).toBe(false);
  });
});
