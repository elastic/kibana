/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { UserAvatar } from './user_avatar';

describe('UserAvatar', () => {
  it('should render `EuiAvatar` correctly with image avatar', () => {
    const wrapper = shallow(
      <UserAvatar
        user={{
          username: 'delighted_nightingale',
          email: 'delighted_nightingale@elastic.co',
          fullName: 'Delighted Nightingale',
        }}
        avatar={{
          color: '#09e8ca',
          initials: 'DN',
          imageUrl: 'https://source.unsplash.com/64x64/?cat',
        }}
      />
    );
    expect(wrapper).toMatchInlineSnapshot(`
      <EuiAvatar
        color="plain"
        imageUrl="https://source.unsplash.com/64x64/?cat"
        name="Delighted Nightingale"
      />
    `);
  });

  it('should render `EuiAvatar` correctly with initials avatar', () => {
    const wrapper = shallow(
      <UserAvatar
        user={{
          username: 'delighted_nightingale',
          email: 'delighted_nightingale@elastic.co',
          fullName: 'Delighted Nightingale',
        }}
        avatar={{
          color: '#09e8ca',
          initials: 'DN',
          imageUrl: undefined,
        }}
      />
    );
    expect(wrapper).toMatchInlineSnapshot(`
      <EuiAvatar
        color="#09e8ca"
        initials="DN"
        initialsLength={2}
        name="Delighted Nightingale"
      />
    `);
  });

  it('should render `EuiAvatar` correctly without avatar data', () => {
    const wrapper = shallow(
      <UserAvatar
        user={{
          username: 'delighted_nightingale',
          email: 'delighted_nightingale@elastic.co',
          fullName: 'Delighted Nightingale',
        }}
      />
    );
    expect(wrapper).toMatchInlineSnapshot(`
      <EuiAvatar
        color="#AA6556"
        initials="DN"
        initialsLength={2}
        name="Delighted Nightingale"
      />
    `);
  });

  it('should render `EuiAvatar` correctly without user data', () => {
    const wrapper = shallow(<UserAvatar />);
    expect(wrapper).toMatchInlineSnapshot(`
      <EuiAvatar
        color="#F1F4FA"
        initials="?"
        name=""
      />
    `);
  });
});
