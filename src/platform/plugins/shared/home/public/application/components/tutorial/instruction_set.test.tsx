/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { InstructionSet, InstructionVariantShape } from './instruction_set';
import * as StatusCheckStates from './status_check_states';
import { render } from '@testing-library/react';
import { getServices } from '../../kibana_services';

jest.mock('../../kibana_services', () => ({
  getServices: jest.fn(),
}));

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

const instructionVariants: InstructionVariantShape[] = [
  {
    id: 'OSX',
    instructions,
    initialSelected: false,
  },
  {
    id: 'WINDOWS',
    instructions,
    initialSelected: false,
  },
];

const mockReplaceTemplateStrings = (text: string) => {
  return `Processed: ${text}`;
};

beforeAll(() => {
  (getServices as jest.Mock).mockImplementation(() => ({
    tutorialService: {
      getCustomComponent: jest.fn(),
    },
    theme: {
      theme$: jest.fn(),
      getTheme: jest.fn(() => ({
        darkMode: false,
      })),
    },
  }));
});

test('render', () => {
  const component = render(
    <IntlProvider>
      <InstructionSet
        title="title1"
        instructionVariants={instructionVariants}
        onStatusCheck={() => {}}
        offset={1}
        paramValues={{}}
        replaceTemplateStrings={mockReplaceTemplateStrings}
        isCloudEnabled={false}
      />
    </IntlProvider>
  );
  expect(component).toMatchSnapshot();
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
    const component = render(
      <IntlProvider>
        <InstructionSet
          title="title1"
          instructionVariants={instructionVariants}
          onStatusCheck={() => {}}
          offset={1}
          paramValues={{}}
          replaceTemplateStrings={() => {}}
          isCloudEnabled={false}
          statusCheckConfig={statusCheckConfig}
          statusCheckState={StatusCheckStates.FETCHING}
        />
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('checking status', () => {
    const component = render(
      <IntlProvider>
        <InstructionSet
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
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('failed status check - error', () => {
    const component = render(
      <IntlProvider>
        <InstructionSet
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
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('failed status check - no data', () => {
    const component = render(
      <IntlProvider>
        <InstructionSet
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
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('successful status check', () => {
    const component = render(
      <IntlProvider>
        <InstructionSet
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
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });
});
