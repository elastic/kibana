/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EmptyState } from '../empty_state';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test/jest';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    createHref: jest.fn(),
  }),
}));

describe('EmptyState', () => {
  it('should render normally', () => {
    const component = shallow(
      <EmptyState onRefresh={() => {}} createAnyway={() => {}} closeFlyout={() => {}} />
    );

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    describe('onRefresh', () => {
      it('is called when refresh button is clicked', () => {
        const onRefreshHandler = sinon.stub();

        const component = mountWithIntl(
          <EmptyState onRefresh={onRefreshHandler} createAnyway={() => {}} closeFlyout={() => {}} />
        );

        findTestSubject(component, 'refreshIndicesButton').simulate('click');

        sinon.assert.calledOnce(onRefreshHandler);
      });
    });
  });
});
