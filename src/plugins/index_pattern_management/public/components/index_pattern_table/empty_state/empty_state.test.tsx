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
