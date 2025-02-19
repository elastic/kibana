/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Instruction, InstructionProps } from './instruction';

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    http: {
      post: jest.fn().mockImplementation(async () => ({ count: 1 })),
      basePath: { prepend: (path: string) => `/foo/${path}` },
    },
    getBasePath: jest.fn(() => 'path'),
    theme: {
      getTheme: () => ({ darkMode: false }),
    },
    tutorialService: {
      getCustomComponent: jest
        .fn()
        .mockResolvedValue({ default: () => <div>Custom Component</div> }),
    },
  }),
}));

const replaceTemplateStrings = (text: string) => {
  return text;
};
const commonProps: InstructionProps = {
  variantId: 'OSX',
  paramValues: {},
  isCloudEnabled: false,
  replaceTemplateStrings,
};

describe('Instruction component', () => {
  test('should render with textPre and textPost', async () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <Instruction {...commonProps} textPre="Pre text" textPost="Post text" />
      </IntlProvider>
    );

    expect(getByText('Pre text')).toBeInTheDocument();
    expect(getByText('Post text')).toBeInTheDocument();
  });

  test('should render with commands', async () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <Instruction {...commonProps} commands={['echo "Hello, World!"']} />
      </IntlProvider>
    );

    expect(getByText('echo "Hello, World!"')).toBeInTheDocument();
  });

  test('should render with customComponentName', async () => {
    // TODO
  });

  test('should render with isCloudEnabled', async () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <Instruction
          {...commonProps}
          isCloudEnabled={true}
          textPre="Cloud Pre text"
          textPost="Cloud Post text"
        />
      </IntlProvider>
    );

    expect(getByText('Cloud Pre text')).toBeInTheDocument();
    expect(getByText('Cloud Post text')).toBeInTheDocument();
  });
});
