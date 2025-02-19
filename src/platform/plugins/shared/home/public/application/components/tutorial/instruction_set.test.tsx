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
import { fireEvent, render } from '@testing-library/react';
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
const mockSetParameter = jest.fn();

const defaultProps = {
  title: 'title1',
  instructionVariants,
  onStatusCheck: () => {},
  offset: 1,
  paramValues: {},
  statusCheckConfig: {
    success: 'custom success msg',
    error: 'custom error msg',
    title: 'custom title',
    text: 'custom status check description',
    btnLabel: 'custom btn label',
  },
  replaceTemplateStrings: mockReplaceTemplateStrings,
  isCloudEnabled: false,
  setParameter: mockSetParameter,
  params: [],
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

describe('render InstructionSet component', () => {
  test('should handle all status check states', () => {
    const { getByText, queryByText, rerender } = render(
      <IntlProvider locale="en">
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.NOT_CHECKED} />
      </IntlProvider>
    );

    // Initial state - no check has been attempted
    expect(getByText('title1')).toBeInTheDocument();
    expect(getByText('custom title')).toBeInTheDocument();
    expect(queryByText('custom success msg')).not.toBeInTheDocument();
    expect(queryByText('custom error msg')).not.toBeInTheDocument();

    // Checking status
    rerender(
      <IntlProvider locale="en">
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.FETCHING} />
      </IntlProvider>
    );
    expect(queryByText('custom success msg')).not.toBeInTheDocument();
    expect(queryByText('custom error msg')).not.toBeInTheDocument();

    // Failed status check - error
    rerender(
      <IntlProvider locale="en">
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.ERROR} />
      </IntlProvider>
    );
    expect(getByText('custom error msg')).toBeInTheDocument();

    // Failed status check - no data
    rerender(
      <IntlProvider locale="en">
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.NO_DATA} />
      </IntlProvider>
    );
    expect(getByText('custom error msg')).toBeInTheDocument();

    // Successful status check
    rerender(
      <IntlProvider locale="en">
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.HAS_DATA} />
      </IntlProvider>
    );
    expect(getByText('custom success msg')).toBeInTheDocument();
  });

  test('should render different instruction variants', () => {
    const { getByText, rerender } = render(
      <IntlProvider locale="en">
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.NOT_CHECKED} />
      </IntlProvider>
    );

    // Check initial variant
    expect(getByText('step 1')).toBeInTheDocument();
    expect(getByText('step 2')).toBeInTheDocument();

    // Change to another variant
    rerender(
      <IntlProvider locale="en">
        <InstructionSet
          {...defaultProps}
          statusCheckState={StatusCheckStates.NOT_CHECKED}
          instructionVariants={[
            ...instructionVariants,
            { id: 'LINUX', instructions, initialSelected: true },
          ]}
        />
      </IntlProvider>
    );
    expect(getByText('step 1')).toBeInTheDocument();
    expect(getByText('step 2')).toBeInTheDocument();
  });

  test('should toggle parameter form visibility', () => {
    const { getByText, queryByText } = render(
      <IntlProvider locale="en">
        <InstructionSet
          {...defaultProps}
          statusCheckState={StatusCheckStates.NOT_CHECKED}
          params={[{ id: 'id-1', label: 'Param 1', type: 'string' }]}
          paramValues={{ value: 'param value' }}
        />
      </IntlProvider>
    );

    // Check initial state (form hidden)
    expect(queryByText('Param 1')).not.toBeInTheDocument();

    // Click to show form
    fireEvent.click(getByText('Customize your code snippets'));
    expect(getByText('Param 1')).toBeInTheDocument();

    // Click to hide form
    fireEvent.click(getByText('Customize your code snippets'));
    expect(queryByText('Param 1')).not.toBeInTheDocument();
  });

  test('should render custom callout', () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <InstructionSet
          {...defaultProps}
          statusCheckState={StatusCheckStates.NOT_CHECKED}
          callOut={{
            iconType: 'alert',
            message: 'This is a callout message',
            title: 'Callout Title',
          }}
        />
      </IntlProvider>
    );

    expect(getByText('Callout Title')).toBeInTheDocument();
    expect(getByText('This is a callout message')).toBeInTheDocument();
  });
});
