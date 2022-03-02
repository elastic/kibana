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
import { pluginServices } from '../public/services';
import { ControlsServices } from '../public/services';
import { providers } from '../public/services/storybook';
import { PluginServiceRegistry } from '../../presentation_util/public';
import { KibanaContextProvider as KibanaReactProvider } from '../../kibana_react/public';

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
  const registry = new PluginServiceRegistry<ControlsServices>(providers);
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
