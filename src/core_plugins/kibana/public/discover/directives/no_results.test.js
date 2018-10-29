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
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';

import {
  DiscoverNoResults,
} from './no_results';

describe('DiscoverNoResults', () => {
  describe('props', () => {
    describe('shardFailures', () => {
      test('renders failures list when there are failures', () => {
        const shardFailures = [{
          index: 'A',
          shard: '1',
          reason: { reason: 'Awful error' },
        }, {
          index: 'B',
          shard: '2',
          reason: { reason: 'Bad error' },
        }];

        const component = render(
          <DiscoverNoResults
            shardFailures={shardFailures}
            isTimePickerOpen={false}
            topNavToggle={() => {}}
            getDocLink={() => ''}
          />
        );

        expect(component).toMatchSnapshot();
      });

      test(`doesn't render failures list when there are no failures`, () => {
        const shardFailures = [];

        const component = render(
          <DiscoverNoResults
            shardFailures={shardFailures}
            isTimePickerOpen={false}
            topNavToggle={() => {}}
            getDocLink={() => ''}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    describe('isTimePickerOpen', () => {
      test('false is reflected in the aria-expanded state of the button', () => {
        const component = render(
          <DiscoverNoResults
            timeFieldName="awesome_time_field"
            isTimePickerOpen={false}
            topNavToggle={() => {}}
            getDocLink={() => ''}
          />
        );

        expect(
          component.find('[data-test-subj="discoverNoResultsTimefilter"]')[0].attribs['aria-expanded']
        ).toBe('false');
      });

      test('true is reflected in the aria-expanded state of the button', () => {
        const component = render(
          <DiscoverNoResults
            timeFieldName="awesome_time_field"
            isTimePickerOpen={true}
            topNavToggle={() => {}}
            getDocLink={() => ''}
          />
        );

        expect(
          component.find('[data-test-subj="discoverNoResultsTimefilter"]')[0].attribs['aria-expanded']
        ).toBe('true');
      });
    });

    describe('timeFieldName', () => {
      test('renders time range feedback', () => {
        const component = render(
          <DiscoverNoResults
            timeFieldName="awesome_time_field"
            isTimePickerOpen={false}
            topNavToggle={() => {}}
            getDocLink={() => ''}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    describe('queryLanguage', () => {
      test('supports lucene and renders doc link', () => {
        const component = render(
          <DiscoverNoResults
            queryLanguage="lucene"
            isTimePickerOpen={false}
            topNavToggle={() => {}}
            getDocLink={() => 'documentation-link'}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    describe('topNavToggle', () => {
      test('is called whe time picker button is clicked', () => {
        const topNavToggleSpy = sinon.stub();
        const component = mount(
          <DiscoverNoResults
            timeFieldName="awesome_time_field"
            isTimePickerOpen={false}
            topNavToggle={topNavToggleSpy}
            getDocLink={() => ''}
          />
        );

        findTestSubject(component, 'discoverNoResultsTimefilter').simulate('click');
        sinon.assert.calledOnce(topNavToggleSpy);
      });
    });
  });
});
