/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
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
      getCustomComponent: (customComponentName: string) => {
        if (customComponentName === 'customComponent') {
          return () => Promise.resolve(() => <div>Custom Component</div>);
        }
        return () => Promise.resolve(() => <div>Component Not Found</div>);
      },
    },
  }),
}));

const replaceTemplateStrings = (text: string) => text;
const commonProps: InstructionProps = {
  variantId: 'OSX',
  isCloudEnabled: false,
  replaceTemplateStrings,
};

describe('Instruction component', () => {
  test('should render with textPre and textPost', async () => {
    const { getByText } = render(
      <I18nProvider>
        <Instruction {...commonProps} textPre="Pre text" textPost="Post text" />
      </I18nProvider>
    );

    expect(getByText('Pre text')).toBeInTheDocument();
    expect(getByText('Post text')).toBeInTheDocument();
  });

  test('should render with commands', async () => {
    const { getByText } = render(
      <I18nProvider>
        <Instruction {...commonProps} commands={['echo "Hello, World!"']} />
      </I18nProvider>
    );

    expect(getByText('echo "Hello, World!"')).toBeInTheDocument();
  });

  test('should render with customComponentName', async () => {
    const { getByText } = render(
      <I18nProvider>
        <Instruction {...commonProps} customComponentName={'customComponent'} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(getByText('Custom Component')).toBeInTheDocument();
    });
  });

  test("shouldn't render with non existent component name", async () => {
    const { getByText } = render(
      <I18nProvider>
        <Instruction {...commonProps} customComponentName={'fake'} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(getByText('Component Not Found')).toBeInTheDocument();
    });
  });

  test('should render with isCloudEnabled', async () => {
    const { getByText } = render(
      <I18nProvider>
        <Instruction
          {...commonProps}
          isCloudEnabled={true}
          textPre="Cloud Pre text"
          textPost="Cloud Post text"
        />
      </I18nProvider>
    );

    expect(getByText('Cloud Pre text')).toBeInTheDocument();
    expect(getByText('Cloud Post text')).toBeInTheDocument();
  });
});
