import React from 'react';
import type { SettingsApplicationKibanaDependencies } from './services';
export { SettingsApplication } from './application';
export { SettingsApplicationProvider, SettingsApplicationKibanaProvider, type SettingsApplicationServices, type SettingsApplicationKibanaDependencies, } from './services';
export declare const KibanaSettingsApplication: ({ docLinks, i18n, notifications, settings, userProfile, theme, history, sectionRegistry, application, chrome, spaces, }: SettingsApplicationKibanaDependencies) => React.JSX.Element;
