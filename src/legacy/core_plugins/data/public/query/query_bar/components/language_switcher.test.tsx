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

import { shallow } from 'enzyme';
import React from 'react';
import { QueryLanguageSwitcher } from './language_switcher';

describe('LanguageSwitcher', () => {
  it('should toggle off if language is lucene', () => {
    const component = shallow(
      <QueryLanguageSwitcher
        language="lucene"
        onSelectLanguage={() => {
          return;
        }}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should toggle on if language is kuery', () => {
    const component = shallow(
      <QueryLanguageSwitcher
        language="kuery"
        onSelectLanguage={() => {
          return;
        }}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('call onSelectLanguage when the toggle is clicked', () => {
    const callback = jest.fn();
    const component = shallow(
      <QueryLanguageSwitcher language="kuery" onSelectLanguage={callback} />
    );
    component.find('[data-test-subj="languageToggle"]').simulate('change');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
