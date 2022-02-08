/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EmptyIndexListPrompt } from './empty_index_list_prompt';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    createHref: jest.fn(),
  }),
}));

describe('EmptyIndexListPrompt', () => {
  it('should render normally', () => {
    const component = shallow(
      <EmptyIndexListPrompt
        onRefresh={() => {}}
        createAnyway={() => {}}
        closeFlyout={() => {}}
        addDataUrl={'http://elastic.co'}
        navigateToApp={async (appId) => {}}
        canSaveIndexPattern={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    describe('onRefresh', () => {
      it('is called when refresh button is clicked', () => {
        const onRefreshHandler = sinon.stub();

        const component = mountWithIntl(
          <EmptyIndexListPrompt
            onRefresh={onRefreshHandler}
            createAnyway={() => {}}
            closeFlyout={() => {}}
            addDataUrl={'http://elastic.co'}
            navigateToApp={async (appId) => {}}
            canSaveIndexPattern={true}
          />
        );

        findTestSubject(component, 'refreshIndicesButton').simulate('click');

        sinon.assert.calledOnce(onRefreshHandler);
      });
    });
  });
});
