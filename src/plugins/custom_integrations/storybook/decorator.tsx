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

import { PluginServiceRegistry } from '../public/services/create';

import { pluginServices } from '../public/services';
import { CustomIntegrationsServices } from '../public/services';
import { providers } from '../public/services/storybook';
import { EuiThemeProvider } from '../../kibana_react/common/eui_styled_components';

/**
 * Returns a Storybook Decorator that provides both the `I18nProvider` and access to `PluginServices`
 * for components rendered in Storybook.
 */
export const getCustomIntegrationsContextDecorator =
  (): DecoratorFn =>
  (story, { globals }) => {
    const ContextProvider = getCustomIntegrationsContextProvider();
    const darkMode = globals.euiTheme === 'v8.dark' || globals.euiTheme === 'v7.dark';

    return (
      <I18nProvider>
        <EuiThemeProvider darkMode={darkMode}>
          <ContextProvider>{story()}</ContextProvider>
        </EuiThemeProvider>
      </I18nProvider>
    );
  };

/**
 * Prepares `PluginServices` for use in Storybook and returns a React `Context.Provider` element
 * so components that access `PluginServices` can be rendered.
 */
export const getCustomIntegrationsContextProvider = () => {
  const registry = new PluginServiceRegistry<CustomIntegrationsServices>(providers);
  pluginServices.setRegistry(registry.start({}));
  return pluginServices.getContextProvider();
};
