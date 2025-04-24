/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { InstructionSet } from './instruction_set';
import * as StatusCheckStates from './status_check_states';
import { render } from '@testing-library/react';
import { getServices } from '../../kibana_services';
import type { InstructionVariantType } from '../../../services/tutorials/types';

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
const instructionVariants: InstructionVariantType[] = [
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

const defaultProps = {
  title: 'title1',
  instructionVariants,
  onStatusCheck: () => {},
  offset: 1,
  statusCheckConfig: {
    title: 'custom title',
    text: 'custom status check description',
    btnLabel: 'custom btn label',
    success: 'custom success msg',
    error: 'custom error msg',
    esHitsCheck: { index: 'index', query: {} },
  },
  replaceTemplateStrings: mockReplaceTemplateStrings,
  isCloudEnabled: false,
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
      <I18nProvider>
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.NOT_CHECKED} />
      </I18nProvider>
    );

    // Initial state - no check has been attempted
    expect(getByText('title1')).toBeInTheDocument();
    expect(getByText('custom title')).toBeInTheDocument();
    expect(queryByText('custom success msg')).not.toBeInTheDocument();
    expect(queryByText('custom error msg')).not.toBeInTheDocument();

    // Checking status
    rerender(
      <I18nProvider>
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.FETCHING} />
      </I18nProvider>
    );
    expect(queryByText('custom success msg')).not.toBeInTheDocument();
    expect(queryByText('custom error msg')).not.toBeInTheDocument();

    // Failed status check - error
    rerender(
      <I18nProvider>
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.ERROR} />
      </I18nProvider>
    );
    expect(getByText('custom error msg')).toBeInTheDocument();

    // Failed status check - no data
    rerender(
      <I18nProvider>
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.NO_DATA} />
      </I18nProvider>
    );
    expect(getByText('custom error msg')).toBeInTheDocument();

    // Successful status check
    rerender(
      <I18nProvider>
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.HAS_DATA} />
      </I18nProvider>
    );
    expect(getByText('custom success msg')).toBeInTheDocument();
  });

  test('should render different instruction variants', () => {
    const { getByText, rerender } = render(
      <I18nProvider>
        <InstructionSet {...defaultProps} statusCheckState={StatusCheckStates.NOT_CHECKED} />
      </I18nProvider>
    );

    // Check initial variant
    expect(getByText('step 1')).toBeInTheDocument();
    expect(getByText('step 2')).toBeInTheDocument();

    // Change to another variant
    rerender(
      <I18nProvider>
        <InstructionSet
          {...defaultProps}
          statusCheckState={StatusCheckStates.NOT_CHECKED}
          instructionVariants={[
            ...instructionVariants,
            { id: 'LINUX', instructions, initialSelected: true },
          ]}
        />
      </I18nProvider>
    );
    expect(getByText('step 1')).toBeInTheDocument();
    expect(getByText('step 2')).toBeInTheDocument();
  });

  test('should render custom callout', () => {
    const { getByText } = render(
      <I18nProvider>
        <InstructionSet
          {...defaultProps}
          statusCheckState={StatusCheckStates.NOT_CHECKED}
          callOut={{
            iconType: 'alert',
            message: 'This is a callout message',
            title: 'Callout Title',
          }}
        />
      </I18nProvider>
    );

    expect(getByText('Callout Title')).toBeInTheDocument();
    expect(getByText('This is a callout message')).toBeInTheDocument();
  });
});
