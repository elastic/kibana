/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type { CodeEditorProps } from '../code_editor';

type PropArguments = Pick<
  CodeEditorProps,
  | 'languageId'
  | 'value'
  | 'aria-label'
  | 'allowFullScreen'
  | 'transparentBackground'
  | 'placeholder'
>;

export type CodeEditorStorybookParams = Record<keyof PropArguments, any>;

/**
 * Storybook mock for the `CodeEditor` component
 */

export class CodeEditorStorybookMock extends AbstractStorybookMock<
  CodeEditorProps,
  {},
  PropArguments,
  {}
> {
  propArguments = {
    languageId: {
      control: {
        control: 'radio',
      },
      options: ['json', 'loglang', 'plaintext'],
      defaultValue: 'json',
    },
    value: {
      control: {
        control: 'text',
      },
      defaultValue: '',
    },
    'aria-label': {
      control: {
        control: 'text',
      },
      defaultValue: 'code editor',
    },
    allowFullScreen: {
      control: {
        control: 'boolean',
      },
      defaultValue: false,
    },
    transparentBackground: {
      control: {
        control: 'boolean',
      },
      defaultValue: false,
    },
    placeholder: {
      control: {
        control: 'text',
      },
      defaultValue: 'myplaceholder',
    },
  };

  serviceArguments = {};
  dependencies = [];

  getProps(params?: CodeEditorStorybookParams): CodeEditorProps {
    return {
      languageId: this.getArgumentValue('languageId', params),
      value: this.getArgumentValue('value', params),
      'aria-label': this.getArgumentValue('aria-label', params),
      allowFullScreen: this.getArgumentValue('allowFullScreen', params),
      transparentBackground: this.getArgumentValue('transparentBackground', params),
      placeholder: this.getArgumentValue('placeholder', params),
    };
  }

  getServices() {
    return { ...this.getProps() };
  }
}
