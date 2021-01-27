/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n/react';
import { pluginServices } from '../public/services';
import { PresentationUtilServices } from '../public/services';
import { providers, StorybookParams } from '../public/services/storybook';
import { PluginServiceRegistry } from '../public/services/create';

export const servicesContextDecorator: DecoratorFn = (story: Function, storybook) => {
  const registry = new PluginServiceRegistry<PresentationUtilServices, StorybookParams>(providers);
  pluginServices.setRegistry(registry.start(storybook.args));
  const ContextProvider = pluginServices.getContextProvider();

  return (
    <I18nProvider>
      <ContextProvider>{story()}</ContextProvider>
    </I18nProvider>
  );
};
