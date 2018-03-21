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
            topNavToggle={() => {}}
            getDocLink={() => ''}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    describe('timeFieldName', () => {
      test('renders time range feedback', () => {
        const component = render(
          <DiscoverNoResults
            timeFieldName="awesome_time_field"
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
