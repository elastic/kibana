/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock, ArgumentParams } from '@kbn/shared-ux-storybook-mock';
import { ModalProps as ShareModalProps } from '@kbn/share-modal';

import { ArgTypes } from '@storybook/react';
import { ShareModalStorybookMock } from '..';

type PropArguments = Pick<ShareModalProps, 'objectType' | 'tabs' | 'modalBodyDescriptions'>;
type Arguments = PropArguments;

/**
 * Storybook parameters provided from the controls addon.
 */
export type Params = Record<keyof Arguments, any>;

const redirectMock = new ShareModalStorybookMock();

export class StorybookMock extends AbstractStorybookMock<ShareModalProps, {}, PropArguments, {}> {
  serviceArguments: ArgTypes<{}>;
  getServices(params?: ArgumentParams<PropArguments, {}> | undefined): {} {
    throw new Error('Method not implemented.');
  }
  propArguments = {
    objectType: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    modalBodyDescriptions: {
      control: {
        type: 'text',
      },
      defaultValue: '',
    },
    tabs: {},
  };

  dependencies = [];

  getProps(params?: Params): ShareModalProps {
    return {
      modalBodyDescriptions: this.getArgumentValue('description', params),
      objectType: this.getArgumentValue('objectType', params),
      tabs: this.getArgumentValue('tabs', params),
    };
  }
}
