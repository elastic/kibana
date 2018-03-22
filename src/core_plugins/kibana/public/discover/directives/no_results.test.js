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
      test('renders failures list', () => {
        const shardFailures = [{
          index: 'A',
          shard: '1',
          reason: 'Awful error',
        }, {
          index: 'B',
          shard: '2',
          reason: 'Bad error',
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
