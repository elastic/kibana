/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AdvancedSettingsVoiceAnnouncement } from './advanced_settings_voice_announcement';

const testProps = {
  nothing: {
    query: '',
    filteredSettings: [
      [{
        ariaName: 'General'
      }]
    ],
    categoryCounts: 1
  },
  searchResult: {
    query: 'dark theme',
    filteredSettings: [
      [{
        ariaName: 'General'
      }]
    ],
    categoryCounts: 1
  }
};

describe('Advanced Settings: Voice Announcement', () => {
  it('should render nothing', async () => {

    const { query, filteredSettings, categoryCounts } = testProps.nothing;

    const component = shallow(
      <AdvancedSettingsVoiceAnnouncement
        query={query}
        settings={filteredSettings}
        totalCounts={categoryCounts}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render announcement', async () => {

    const { query, filteredSettings, categoryCounts } = testProps.searchResult;

    const component = shallow(
      <AdvancedSettingsVoiceAnnouncement
        query={query}
        settings={filteredSettings}
        totalCounts={categoryCounts}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
