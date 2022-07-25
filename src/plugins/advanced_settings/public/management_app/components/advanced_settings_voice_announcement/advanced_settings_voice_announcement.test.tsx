/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { UiSettingsType } from '@kbn/core/public';

import { AdvancedSettingsVoiceAnnouncement } from './advanced_settings_voice_announcement';

const settingPartial = {
  name: 'name',
  isOverridden: false,
  type: 'string' as UiSettingsType,
  value: 'value',
  defVal: 'defVal',
  optionLabels: { label: 'label' },
  description: 'description',
  displayName: 'displayName',
  isCustom: false,
  requiresPageReload: false,
  options: [],
  validation: { regex: /a/, message: 'message' },
  category: ['category'],
  readOnly: false,
};

const testProps = {
  nothing: {
    query: '',
    filteredSettings: [
      {
        ariaName: 'General',
        ...settingPartial,
      },
    ],
  },
  searchResult: {
    query: 'dark theme',
    filteredSettings: [
      {
        ariaName: 'General',
        ...settingPartial,
      },
    ],
  },
};

describe('Advanced Settings: Voice Announcement', () => {
  it('should render nothing', async () => {
    const { query, filteredSettings } = testProps.nothing;

    const component = shallow(
      <AdvancedSettingsVoiceAnnouncement queryText={query} settings={{ filteredSettings }} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render announcement', async () => {
    const { query, filteredSettings } = testProps.searchResult;

    const component = shallow(
      <AdvancedSettingsVoiceAnnouncement queryText={query} settings={{ filteredSettings }} />
    );

    expect(component).toMatchSnapshot();
  });
});
