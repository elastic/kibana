/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as i18n from '../core';

export type I18nServiceType = ReturnType<I18nProvider['$get']>;

export class I18nProvider implements angular.IServiceProvider {
  public addTranslation = i18n.addTranslation;
  public getTranslation = i18n.getTranslation;
  public setLocale = i18n.setLocale;
  public getLocale = i18n.getLocale;
  public setDefaultLocale = i18n.setDefaultLocale;
  public getDefaultLocale = i18n.getDefaultLocale;
  public setFormats = i18n.setFormats;
  public getFormats = i18n.getFormats;
  public getRegisteredLocales = i18n.getRegisteredLocales;
  public init = i18n.init;
  public load = i18n.load;
  public $get = () => i18n.translate;
}
