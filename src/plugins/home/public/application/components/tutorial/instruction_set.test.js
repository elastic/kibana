/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

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

test('render', () => {
  const component = shallowWithIntl(
    <InstructionSet.WrappedComponent
      title="title1"
      instructionVariants={instructionVariants}
      onStatusCheck={() => {}}
      offset={1}
      paramValues={{}}
      replaceTemplateStrings={() => {}}
      isCloudEnabled={false}
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
        isCloudEnabled={false}
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
        isCloudEnabled={false}
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
        isCloudEnabled={false}
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
        isCloudEnabled={false}
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
        isCloudEnabled={false}
      />
    );
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
