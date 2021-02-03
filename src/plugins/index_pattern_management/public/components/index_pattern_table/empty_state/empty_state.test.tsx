/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EmptyState } from '../empty_state';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test/jest';
import { docLinksServiceMock } from '../../../../../../core/public/mocks';
import { MlCardState } from '../../../types';

const docLinks = docLinksServiceMock.createStartContract();

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    createHref: jest.fn(),
  }),
}));

describe('EmptyState', () => {
  it('should render normally', () => {
    const component = shallow(
      <EmptyState
        docLinks={docLinks}
        onRefresh={() => {}}
        navigateToApp={async () => {}}
        getMlCardState={() => MlCardState.ENABLED}
        canSave={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    describe('onRefresh', () => {
      it('is called when refresh button is clicked', () => {
        const onRefreshHandler = sinon.stub();

        const component = mountWithIntl(
          <EmptyState
            docLinks={docLinks}
            onRefresh={onRefreshHandler}
            navigateToApp={async () => {}}
            getMlCardState={() => MlCardState.ENABLED}
            canSave={true}
          />
        );

        findTestSubject(component, 'refreshIndicesButton').simulate('click');

        sinon.assert.calledOnce(onRefreshHandler);
      });
    });
  });
});
