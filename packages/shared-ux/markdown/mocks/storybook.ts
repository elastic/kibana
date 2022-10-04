/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AbstractStorybookMock, ArgumentParams } from '@kbn/shared-ux-storybook-mock';

import type { MarkdownProps } from '@kbn/shared-ux-markdown';

type PropArguments = Pick<MarkdownProps, 'readOnly' | 'placeholder'>;
export type Params = ArgumentParams<PropArguments, {}>;

interface MarkdownServices {}

/**
 * Storybook mock for the `Markdown` component
 */

//@ts-ignore
export class MarkdownStorybookMock extends AbstractStorybookMock<
  MarkdownProps,
  MarkdownServices,
  PropArguments
> {
  propArguments = {
    readOnly: {
      control: 'boolean',
      defaultValue: false,
    },
    placeholder: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
  };
  serviceArguments = {};
  dependecies = [];

  getProps(params?: Params): MarkdownProps {
    return {
      readOnly: this.getArgumentValue('readOnly', params),
      placeholder: this.getArgumentValue('placeholder', params),
    };
  }

  getServices(params: Params): MarkdownServices {
    return {};
  }
}
