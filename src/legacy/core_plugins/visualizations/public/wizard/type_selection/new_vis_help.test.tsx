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
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { NewVisHelp } from './new_vis_help';

jest.mock('../../np_ready/public/services', () => {
  return {
    getHttp: () => ({
      basePath: {
        prepend: jest.fn((url: string) => `testbasepath${url}`),
      },
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NewVisHelp', () => {
  it('should render as expected', () => {
    expect(
      shallowWithIntl(
        <NewVisHelp
          promotedTypes={[
            {
              aliasUrl: '/my/fancy/new/thing',
              description: 'Some desc',
              highlighted: false,
              icon: 'whatever',
              name: 'whatever',
              promotion: {
                buttonText: 'Do it now!',
                description: 'Look at this fancy new thing!!!',
              },
              title: 'Test title',
              stage: 'production',
            },
          ]}
          addBasePath={(url: string) => `testbasepath${url}`}
        />
      )
    ).toMatchInlineSnapshot(`
      <EuiText>
        <p>
          <FormattedMessage
            defaultMessage="Start creating your visualization by selecting a type for that visualization."
            id="visualizations.newVisWizard.helpText"
            values={Object {}}
          />
        </p>
        <p>
          <strong>
            Look at this fancy new thing!!!
          </strong>
        </p>
        <EuiButton
          fill={true}
          href="testbasepath/my/fancy/new/thing"
          iconSide="right"
          iconType="popout"
          size="s"
        >
          Do it now!
        </EuiButton>
      </EuiText>
    `);
  });
});
