/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { UserProfile } from './user_profile';

import { UserProfilesPopover } from './user_profiles_popover';

const userProfiles: UserProfile[] = [
  {
    uid: 'u_BOulL4QMPSyV9jg5lQI2JmCkUnokHTazBnet3xVHNv0_0',
    enabled: true,
    data: {},
    user: {
      username: 'delighted_nightingale',
      email: 'delighted_nightingale@profiles.elastic.co',
      full_name: 'Delighted Nightingale',
    },
  },
  {
    uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
    enabled: true,
    data: {},
    user: {
      username: 'damaged_raccoon',
      email: 'damaged_raccoon@profiles.elastic.co',
      full_name: 'Damaged Raccoon',
    },
  },
  {
    uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
    enabled: true,
    data: {},
    user: {
      username: 'physical_dinosaur',
      email: 'physical_dinosaur@profiles.elastic.co',
      full_name: 'Physical Dinosaur',
    },
  },
  {
    uid: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
    enabled: true,
    data: {},
    user: {
      username: 'wet_dingo',
      email: 'wet_dingo@profiles.elastic.co',
      full_name: 'Wet Dingo',
    },
  },
];

describe('UserProfilesPopover', () => {
  it('should render `EuiPopover` and `UserProfilesSelectable` correctly', () => {
    const [firstOption, secondOption] = userProfiles;
    const wrapper = shallow(
      <UserProfilesPopover
        title="Title"
        button={<button>Toggle</button>}
        closePopover={jest.fn()}
        selectableProps={{
          selectedOptions: [firstOption],
          defaultOptions: [secondOption],
        }}
      />
    );
    expect(wrapper).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="downCenter"
        button={
          <button>
            Toggle
          </button>
        }
        closePopover={[MockFunction]}
        display="inline-block"
        hasArrow={true}
        initialFocus="#searchInput_generated-id"
        isOpen={false}
        ownFocus={true}
        panelPaddingSize="none"
        repositionToCrossAxis={true}
      >
        <EuiContextMenuPanelClass
          title="Title"
        >
          <UserProfilesSelectable
            defaultOptions={
              Array [
                Object {
                  "data": Object {},
                  "enabled": true,
                  "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "user": Object {
                    "email": "damaged_raccoon@profiles.elastic.co",
                    "full_name": "Damaged Raccoon",
                    "username": "damaged_raccoon",
                  },
                },
              ]
            }
            searchInputId="searchInput_generated-id"
            selectedOptions={
              Array [
                Object {
                  "data": Object {},
                  "enabled": true,
                  "uid": "u_BOulL4QMPSyV9jg5lQI2JmCkUnokHTazBnet3xVHNv0_0",
                  "user": Object {
                    "email": "delighted_nightingale@profiles.elastic.co",
                    "full_name": "Delighted Nightingale",
                    "username": "delighted_nightingale",
                  },
                },
              ]
            }
          />
        </EuiContextMenuPanelClass>
      </EuiPopover>
    `);
  });

  it('should set `initialFocus` and `searchInputId` props correctly', async () => {
    const [firstOption, secondOption] = userProfiles;
    const wrapper = shallow(
      <UserProfilesPopover
        title="Title"
        button={<button>Toggle</button>}
        closePopover={jest.fn()}
        selectableProps={{
          selectedOptions: [firstOption],
          defaultOptions: [secondOption],
        }}
        isOpen
      />
    );

    expect(wrapper.find('EuiPopover').prop('initialFocus')).toBe('#searchInput_generated-id');
    expect(wrapper.find('UserProfilesSelectable').prop('searchInputId')).toBe(
      'searchInput_generated-id'
    );
  });
});
