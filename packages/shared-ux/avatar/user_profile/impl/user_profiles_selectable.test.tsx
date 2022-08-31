/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount } from 'enzyme';
import React from 'react';

import { UserProfilesSelectable } from './user_profiles_selectable';

const userProfiles = [
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

describe('UserProfilesSelectable', () => {
  it('should render `selectedOptions` before `defaultOptions` separated by a group label', () => {
    const [firstOption, secondOption, thirdOption] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable
        selectedOptions={[firstOption]}
        defaultOptions={[secondOption, thirdOption]}
      />
    );
    expect(wrapper.find('EuiSelectable').prop('options')).toEqual([
      expect.objectContaining({
        key: firstOption.uid,
        checked: 'on',
      }),
      expect.objectContaining({
        isGroupLabel: true,
        label: 'Suggested',
      }),
      expect.objectContaining({
        key: secondOption.uid,
        checked: undefined,
      }),
      expect.objectContaining({
        key: thirdOption.uid,
        checked: undefined,
      }),
    ]);
  });

  it('should hide `selectedOptions` and `defaultOptions` when `options` has been provided', () => {
    const [firstOption, secondOption, thirdOption] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable
        selectedOptions={[firstOption]}
        defaultOptions={[secondOption]}
        options={[thirdOption]}
      />
    );
    expect(wrapper.find('EuiSelectable').prop('options')).toEqual([
      expect.objectContaining({
        key: thirdOption.uid,
        checked: undefined,
      }),
    ]);
  });

  it('should hide `selectedOptions` and `defaultOptions` when `options` gets updated', () => {
    const [firstOption, secondOption, thirdOption] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable selectedOptions={[firstOption]} defaultOptions={[secondOption]} />
    );
    expect(wrapper.find('EuiSelectable').prop('options')).toEqual([
      expect.objectContaining({
        key: firstOption.uid,
        checked: 'on',
      }),
      expect.objectContaining({
        isGroupLabel: true,
        label: 'Suggested',
      }),
      expect.objectContaining({
        key: secondOption.uid,
        checked: undefined,
      }),
    ]);

    wrapper.setProps({ options: [thirdOption] }).update();

    expect(wrapper.find('EuiSelectable').prop('options')).toEqual([
      expect.objectContaining({
        key: thirdOption.uid,
        checked: undefined,
      }),
    ]);
  });

  it('should render `options` with correct checked status', () => {
    const [firstOption, secondOption] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable
        selectedOptions={[firstOption]}
        options={[firstOption, secondOption]}
      />
    );
    expect(wrapper.find('EuiSelectable').prop('options')).toEqual([
      expect.objectContaining({
        key: firstOption.uid,
        checked: 'on',
      }),
      expect.objectContaining({
        key: secondOption.uid,
        checked: undefined,
      }),
    ]);
  });

  it('should trigger `onChange` callback when selection changes', () => {
    const onChange = jest.fn();
    const [firstOption, secondOption] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable
        selectedOptions={[firstOption]}
        defaultOptions={[secondOption]}
        onChange={onChange}
      />
    );
    wrapper.find('EuiSelectableListItem').last().simulate('click');
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          uid: firstOption.uid,
        }),
        expect.objectContaining({
          uid: secondOption.uid,
        }),
      ])
    );
  });

  it('should continue to display `selectedOptions` when getting unchecked', () => {
    const onChange = jest.fn();
    const [firstOption] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable selectedOptions={[firstOption]} onChange={onChange} />
    );
    expect(wrapper.find('EuiSelectable').prop('options')).toEqual([
      expect.objectContaining({
        key: firstOption.uid,
        checked: 'on',
      }),
    ]);
    wrapper.setProps({ selectedOptions: [] }).update();
    expect(wrapper.find('EuiSelectable').prop('options')).toEqual([
      expect.objectContaining({
        key: firstOption.uid,
        checked: undefined,
      }),
    ]);
  });

  it('should trigger `onSearchChange` callback when search term changes', () => {
    const onSearchChange = jest.fn();
    const wrapper = mount(<UserProfilesSelectable onSearchChange={onSearchChange} />);
    wrapper.find('input[type="search"]').simulate('change', { target: { value: 'search' } });
    expect(onSearchChange).toHaveBeenCalledWith('search', []);
  });
});
