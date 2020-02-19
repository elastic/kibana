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

import { InstructionSet } from './instruction_set';
import * as StatusCheckStates from './status_check_states';

const instructions = [
  {
    title: 'step 1',
    commands: ['do stuff in command line'],
  },
  {
    title: 'step 2',
    commands: ['do more stuff in command line'],
  },
];

const instructionVariants = [
  {
    id: 'OSX',
    instructions: instructions,
  },
  {
    id: 'windows',
    instructions: instructions,
  },
];

jest.mock('../../../../../../kibana_react/public', () => {
  return {
    Markdown: () => <div className="markdown" />,
  };
});

test('render', () => {
  const component = shallowWithIntl(
    <InstructionSet.WrappedComponent
      title="title1"
      instructionVariants={instructionVariants}
      onStatusCheck={() => {}}
      offset={1}
      paramValues={{}}
      replaceTemplateStrings={() => {}}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('statusCheckState', () => {
  const statusCheckConfig = {
    success: 'custom success msg',
    error: 'custom error msg',
    title: 'custom title',
    text: 'custom status check description',
    btnLabel: 'custom btn label',
  };

  test('initial state - no check has been attempted', () => {
    const component = shallowWithIntl(
      <InstructionSet.WrappedComponent
        title="title1"
        instructionVariants={instructionVariants}
        onStatusCheck={() => {}}
        offset={1}
        paramValues={{}}
        statusCheckConfig={statusCheckConfig}
        replaceTemplateStrings={() => {}}
        statusCheckState={StatusCheckStates.FETCHING}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('checking status', () => {
    const component = shallowWithIntl(
      <InstructionSet.WrappedComponent
        title="title1"
        instructionVariants={instructionVariants}
        onStatusCheck={() => {}}
        offset={1}
        paramValues={{}}
        statusCheckConfig={statusCheckConfig}
        replaceTemplateStrings={() => {}}
        statusCheckState={StatusCheckStates.FETCHING}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('failed status check - error', () => {
    const component = shallowWithIntl(
      <InstructionSet.WrappedComponent
        title="title1"
        instructionVariants={instructionVariants}
        onStatusCheck={() => {}}
        offset={1}
        paramValues={{}}
        statusCheckConfig={statusCheckConfig}
        replaceTemplateStrings={() => {}}
        statusCheckState={StatusCheckStates.ERROR}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('failed status check - no data', () => {
    const component = shallowWithIntl(
      <InstructionSet.WrappedComponent
        title="title1"
        instructionVariants={instructionVariants}
        onStatusCheck={() => {}}
        offset={1}
        paramValues={{}}
        statusCheckConfig={statusCheckConfig}
        replaceTemplateStrings={() => {}}
        statusCheckState={StatusCheckStates.NO_DATA}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('successful status check', () => {
    const component = shallowWithIntl(
      <InstructionSet.WrappedComponent
        title="title1"
        instructionVariants={instructionVariants}
        onStatusCheck={() => {}}
        offset={1}
        paramValues={{}}
        statusCheckConfig={statusCheckConfig}
        replaceTemplateStrings={() => {}}
        statusCheckState={StatusCheckStates.HAS_DATA}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
