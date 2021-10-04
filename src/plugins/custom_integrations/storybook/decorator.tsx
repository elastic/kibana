/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n/react';

import { PluginServiceRegistry } from '../../presentation_util/public';

import { pluginServices } from '../public/services';
import { CustomIntegrationsServices } from '../public/services';
import { providers } from '../public/services/storybook';

export const getCustomIntegrationsContextDecorator: DecoratorFn = (story, _storybook) => {
  const ContextProvider = getCustomIntegrationsContextProvider();

  return (
    <I18nProvider>
      <ContextProvider>{story()}</ContextProvider>
    </I18nProvider>
  );
};

export const getCustomIntegrationsContextProvider = () => {
  const registry = new PluginServiceRegistry<CustomIntegrationsServices>(providers);
  pluginServices.setRegistry(registry.start({}));
  return pluginServices.getContextProvider();
};
