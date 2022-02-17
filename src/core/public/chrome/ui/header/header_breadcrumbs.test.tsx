/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';
import { HeaderBreadcrumbs } from './header_breadcrumbs';

describe('HeaderBreadcrumbs', () => {
  it('renders updates to the breadcrumbs$ observable', () => {
    const breadcrumbs$ = new BehaviorSubject([{ text: 'First' }]);
    const wrapper = mount(<HeaderBreadcrumbs breadcrumbs$={breadcrumbs$} />);
    expect(wrapper.find('.euiBreadcrumb')).toMatchSnapshot();

    act(() => breadcrumbs$.next([{ text: 'First' }, { text: 'Second' }]));
    wrapper.update();
    expect(wrapper.find('.euiBreadcrumb')).toMatchSnapshot();

    act(() => breadcrumbs$.next([]));
    wrapper.update();
    expect(wrapper.find('.euiBreadcrumb')).toMatchSnapshot();
  });
});
