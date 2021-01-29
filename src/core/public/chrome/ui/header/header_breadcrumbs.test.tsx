/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mount } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { ChromeBreadcrumbsAppendExtension } from '../../chrome_service';

describe('HeaderBreadcrumbs', () => {
  it('renders updates to the breadcrumbs$ observable', () => {
    const breadcrumbs$ = new BehaviorSubject([{ text: 'First' }]);
    const wrapper = mount(
      <HeaderBreadcrumbs
        appTitle$={new BehaviorSubject('')}
        breadcrumbs$={breadcrumbs$}
        breadcrumbsAppendExtension$={new BehaviorSubject(undefined)}
      />
    );
    expect(wrapper.find('.euiBreadcrumb')).toMatchSnapshot();

    act(() => breadcrumbs$.next([{ text: 'First' }, { text: 'Second' }]));
    wrapper.update();
    expect(wrapper.find('.euiBreadcrumb')).toMatchSnapshot();

    act(() => breadcrumbs$.next([]));
    wrapper.update();
    expect(wrapper.find('.euiBreadcrumb')).toMatchSnapshot();
  });

  it('renders breadcrumbs extension', () => {
    const breadcrumbs$ = new BehaviorSubject([{ text: 'First' }]);
    const breadcrumbsAppendExtension$ = new BehaviorSubject<
      undefined | ChromeBreadcrumbsAppendExtension
    >({
      content: (root: HTMLDivElement) => {
        root.innerHTML = '<div class="my-extension">__render__</div>';
        return () => (root.innerHTML = '');
      },
    });

    const wrapper = mount(
      <HeaderBreadcrumbs
        appTitle$={new BehaviorSubject('')}
        breadcrumbs$={breadcrumbs$}
        breadcrumbsAppendExtension$={breadcrumbsAppendExtension$}
      />
    );

    expect(wrapper.find('.euiBreadcrumb').getDOMNode().querySelector('my-extension')).toBeDefined();
    act(() => breadcrumbsAppendExtension$.next(undefined));
    wrapper.update();
    expect(wrapper.find('.euiBreadcrumb').getDOMNode().querySelector('my-extension')).toBeNull();
  });
});
