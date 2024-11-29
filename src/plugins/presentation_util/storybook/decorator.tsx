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
import { KibanaContextProvider as KibanaReactProvider } from '@kbn/kibana-react-plugin/public';
import { DecoratorFn } from '@storybook/react';
import { setStubKibanaServices } from '../public/services/mocks';

const settings = new Map();
settings.set('darkMode', true);

const services = {
  http: {
    basePath: {
      get: () => '',
      prepend: () => '',
      remove: () => '',
      serverBasePath: '',
    },
  },
  uiSettings: settings,
};

export const servicesContextDecorator: DecoratorFn = (story: Function, storybook) => {
  setStubKibanaServices();

  return (
    <I18nProvider>
      <KibanaReactProvider services={services}>{story()}</KibanaReactProvider>
    </I18nProvider>
  );
};
