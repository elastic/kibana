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
        type: 'radio',
      },
      options: ['json', 'loglang', 'plaintext'],
      defaultValue: 'json',
    },
    value: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    'aria-label': {
      control: {
        type: 'text',
      },
      defaultValue: 'code editor',
    },
    allowFullScreen: {
      control: {
        type: 'boolean',
      },
      defaultValue: false,
    },
    transparentBackground: {
      control: {
        type: 'boolean',
      },
      defaultValue: false,
    },
    placeholder: {
      control: {
        type: 'text',
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
