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
import { StatusMessage } from '../status_message';
import { shallow } from 'enzyme';

const matchedIndices = {
  allIndices: [{ name: 'kibana' }, { name: 'es' }],
  exactMatchedIndices: [],
  partialMatchedIndices: [{ name: 'kibana' }],
};

describe('StatusMessage', () => {
  it('should render without a query', () => {
    const component = shallow(<StatusMessage matchedIndices={matchedIndices} query={''} />);

    expect(component).toMatchSnapshot();
  });

  it('should render with exact matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      exactMatchedIndices: [{ name: 'kibana' }],
    };

    const component = shallow(<StatusMessage matchedIndices={localMatchedIndices} query={'k*'} />);

    expect(component).toMatchSnapshot();
  });

  it('should render with partial matches', () => {
    const component = shallow(<StatusMessage matchedIndices={matchedIndices} query={'k'} />);

    expect(component).toMatchSnapshot();
  });

  it('should render with no partial matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      partialMatchedIndices: [],
    };

    const component = shallow(<StatusMessage matchedIndices={localMatchedIndices} query={'k'} />);

    expect(component).toMatchSnapshot();
  });

  it('should show that system indices exist', () => {
    const component = shallow(
      <StatusMessage matchedIndices={[]} isIncludingSystemIndices={false} query={''} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should show that no indices exist', () => {
    const component = shallow(
      <StatusMessage matchedIndices={[]} isIncludingSystemIndices={true} query={''} />
    );

    expect(component).toMatchSnapshot();
  });
});
