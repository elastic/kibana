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

import { render } from 'enzyme';
import PropTypes from 'prop-types';
import React from 'react';

jest.mock('ui/new_platform', () => ({
  npStart: {
    core: {
      i18n: { Context: ({ children }: any) => <div>Context: {children}</div> },
    },
  },
}));

import { wrapInI18nContext } from '.';

describe('ui/i18n', () => {
  test('renders children and forwards properties', () => {
    const mockPropTypes = {
      stringProp: PropTypes.string.isRequired,
      numberProp: PropTypes.number,
    };

    const WrappedComponent = wrapInI18nContext(
      class extends React.PureComponent<{ [P in keyof typeof mockPropTypes]: unknown }> {
        public static propTypes = mockPropTypes;

        public render() {
          return (
            <span>
              Child: {this.props.stringProp}:{this.props.numberProp}
            </span>
          );
        }
      }
    );

    expect(WrappedComponent.propTypes).toBe(mockPropTypes);
    expect(
      render(<WrappedComponent stringProp={'some prop'} numberProp={100500} />)
    ).toMatchSnapshot();
  });
});
