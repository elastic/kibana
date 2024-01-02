/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { AddDataPromptComponentProps } from '../../src/add_data';

export type Params = Pick<AddDataPromptComponentProps, 'emptyPromptColor'>;

export class StorybookMock extends AbstractStorybookMock<AddDataPromptComponentProps, {}, {}, {}> {
  propArguments = {};
  serviceArguments = {};
  dependencies = [];

  getProps(params: Params) {
    return {
      addDataHref: '/spammm1231',
      dataViewsDocLink: 'https://www.do-you-know-about-data-views.com',
      emptyPromptColor: params.emptyPromptColor,
    };
  }

  getServices() {
    return {};
  }
}
