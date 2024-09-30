/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import {
  MinimumScheduleInterval,
  Rule,
  RuleFormBaseErrors,
  RuleFormParamsErrors,
  RuleTypeModel,
  RuleTypeParams,
  RuleTypeRegistryContract,
  RuleTypeWithDescription,
} from '../common/types';

export interface RuleFormData<Params extends RuleTypeParams = RuleTypeParams> {
  name: Rule<Params>['name'];
  tags: Rule<Params>['tags'];
  params: Rule<Params>['params'];
  schedule: Rule<Params>['schedule'];
  consumer: Rule<Params>['consumer'];
  alertDelay?: Rule<Params>['alertDelay'];
  notifyWhen?: Rule<Params>['notifyWhen'];
  ruleTypeId?: Rule<Params>['ruleTypeId'];
}

export interface RuleFormPlugins {
  http: HttpStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  application: ApplicationStart;
  notification: NotificationsStart;
  charts: ChartsPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  docLinks: DocLinksStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
}

export interface RuleFormState<Params extends RuleTypeParams = RuleTypeParams> {
  id?: string;
  formData: RuleFormData<Params>;
  plugins: RuleFormPlugins;
  baseErrors?: RuleFormBaseErrors;
  paramsErrors?: RuleFormParamsErrors;
  selectedRuleType: RuleTypeWithDescription;
  selectedRuleTypeModel: RuleTypeModel<Params>;
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  metadata?: Record<string, unknown>;
  minimumScheduleInterval?: MinimumScheduleInterval;
  canShowConsumerSelection?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
}

export type InitialRule = Partial<Rule> &
  Pick<Rule, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags'>;
