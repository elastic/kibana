import React from 'react';
import { shallow } from 'enzyme';

import {
  InstructionSet,
} from './instruction_set';

const instructions = [
  {
    title: 'step 1',
    commands: [
      'do stuff in command line',
    ],
  },
  {
    title: 'step 2',
    commands: [
      'do more stuff in command line',
    ],
  }
];

const instructionVariants = [
  {
    id: 'OSX',
    instructions: instructions
  },
  {
    id: 'windows',
    instructions: instructions,
  }
];

test('render', () => {
  const component = shallow(<InstructionSet
    title="title1"
    instructionVariants={instructionVariants}
    onStatusCheck={() => {}}
    offset={1}
    paramValues={{}}
    replaceTemplateStrings={() => {}}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('status check', () => {
  const statusCheckConfig = {
    success: 'custom success msg',
    error: 'custom error msg',
    title: 'custom title',
    text: 'custom status check description',
    btnLabel: 'custom btn label',
  };

  test('initial state - no check has been attempted', () => {
    const component = shallow(<InstructionSet
      title="title1"
      instructionVariants={instructionVariants}
      onStatusCheck={() => {}}
      offset={1}
      paramValues={{}}
      statusCheckConfig={statusCheckConfig}
      replaceTemplateStrings={() => {}}
      statusCheckState="incomplete"
      hasStatusCheckFailed={false}
      isCheckingStatus={false}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('checking status', () => {
    const component = shallow(<InstructionSet
      title="title1"
      instructionVariants={instructionVariants}
      onStatusCheck={() => {}}
      offset={1}
      paramValues={{}}
      statusCheckConfig={statusCheckConfig}
      replaceTemplateStrings={() => {}}
      statusCheckState="incomplete"
      hasStatusCheckFailed={false}
      isCheckingStatus={true}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('failed status check', () => {
    const component = shallow(<InstructionSet
      title="title1"
      instructionVariants={instructionVariants}
      onStatusCheck={() => {}}
      offset={1}
      paramValues={{}}
      statusCheckConfig={statusCheckConfig}
      replaceTemplateStrings={() => {}}
      statusCheckState="incomplete"
      hasStatusCheckFailed={true}
      isCheckingStatus={false}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('successful status check', () => {
    const component = shallow(<InstructionSet
      title="title1"
      instructionVariants={instructionVariants}
      onStatusCheck={() => {}}
      offset={1}
      paramValues={{}}
      statusCheckConfig={statusCheckConfig}
      replaceTemplateStrings={() => {}}
      statusCheckState="complete"
      hasStatusCheckFailed={false}
      isCheckingStatus={false}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
