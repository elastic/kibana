/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider as KibanaReactProvider } from '@kbn/kibana-react-plugin/public';
import { pluginServices } from '../public/services';
import { PresentationUtilServices } from '../public/services';
import { providers, StorybookParams } from '../public/services/storybook';
import { PluginServiceRegistry } from '../public/services/create';

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
  const registry = new PluginServiceRegistry<PresentationUtilServices, StorybookParams>(providers);
  pluginServices.setRegistry(registry.start(storybook.args));
  const ContextProvider = pluginServices.getContextProvider();

  return (
    <I18nProvider>
      <KibanaReactProvider services={services}>
        <ContextProvider>{story()}</ContextProvider>
      </KibanaReactProvider>
    </I18nProvider>
  );
};
