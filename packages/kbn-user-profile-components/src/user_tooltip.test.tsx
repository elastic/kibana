/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { UserToolTip } from './user_tooltip';

describe('UserToolTip', () => {
  it('should render `EuiToolTip` correctly with `UserAvatar`', () => {
    const wrapper = shallow(
      <UserToolTip
        user={{
          username: 'delighted_nightingale',
          email: 'delighted_nightingale@elastic.co',
          full_name: 'Delighted Nightingale',
        }}
        avatar={{
          color: '#09e8ca',
          initials: 'DN',
          imageUrl: 'https://source.unsplash.com/64x64/?cat',
        }}
        position="top"
        delay="regular"
      >
        <button>Toggle</button>
      </UserToolTip>
    );
    expect(wrapper).toMatchInlineSnapshot(`
      <EuiToolTip
        content={
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem
              grow={false}
            >
              <UserAvatar
                avatar={
                  Object {
                    "color": "#09e8ca",
                    "imageUrl": "https://source.unsplash.com/64x64/?cat",
                    "initials": "DN",
                  }
                }
                size="l"
                user={
                  Object {
                    "email": "delighted_nightingale@elastic.co",
                    "full_name": "Delighted Nightingale",
                    "username": "delighted_nightingale",
                  }
                }
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={true}
              style={
                Object {
                  "minWidth": 0,
                }
              }
            >
              <div>
                Delighted Nightingale
              </div>
              <EuiText
                size="xs"
              >
                delighted_nightingale@elastic.co
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        delay="regular"
        display="inlineBlock"
        position="top"
      >
        <button>
          Toggle
        </button>
      </EuiToolTip>
    `);
  });
});
