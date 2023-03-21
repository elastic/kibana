/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';

import type { MarkdownProps } from '@kbn/shared-ux-markdown-types';

type PropArguments = Pick<
  MarkdownProps,
  | 'readOnly'
  | 'placeholder'
  | 'markdownContent'
  | 'height'
  | 'ariaLabelContent'
  | 'openLinksInNewTab'
>;

export type Params = Record<keyof PropArguments, any>;

/**
 * Storybook mock for the `Markdown` component
 */

export class MarkdownStorybookMock extends AbstractStorybookMock<
  MarkdownProps,
  {},
  PropArguments,
  {}
> {
  propArguments = {
    readOnly: {
      control: 'boolean',
      defaultValue: false,
    },
    openLinksInNewTab: {
      control: 'boolean',
      defaultValue: true,
    },
    placeholder: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    markdownContent: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    ariaLabelContent: {
      control: {
        type: 'text',
      },
      defaultValue: 'markdown component',
    },
    height: {
      control: {
        type: 'select',
        defaultValue: 'full',
        label: 'height',
        options: [0, 20, 50, 'full'],
      },
    },
  };

  serviceArguments = {};
  dependencies = [];

  getProps(params?: Params): MarkdownProps {
    return {
      readOnly: this.getArgumentValue('readOnly', params),
      placeholder: this.getArgumentValue('placeholder', params),
      markdownContent: this.getArgumentValue('markdownContent', params),
      height: this.getArgumentValue('height', params),
      ariaLabelContent: this.getArgumentValue('ariaLabelContent', params),
      openLinksInNewTab: this.getArgumentValue('openLinksInNewTab', params),
    };
  }

  getServices() {
    return { ...this.getProps() };
  }
}
