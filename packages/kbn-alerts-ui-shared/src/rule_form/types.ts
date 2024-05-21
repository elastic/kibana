/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ComponentType } from 'react';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  RuleNotifyWhenType,
  ActionGroup,
  SanitizedRule as AlertingSanitizedRule,
  RuleAction,
  RuleSystemAction,
} from '@kbn/alerting-types';
import type { RuleTypeWithDescription } from '../common/types';

export type RuleTypeParams = Record<string, unknown>;

export interface RuleFormErrors {
  [key: string]: string | string[] | RuleFormErrors;
}

export interface MinimumScheduleInterval {
  value: string;
  enforce: boolean;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

type RuleUiAction = RuleAction | RuleSystemAction;

// In Triggers and Actions we treat all `Alert`s as `SanitizedRule<RuleTypeParams>`
// so the `Params` is a black-box of Record<string, unknown>
type SanitizedRule<Params extends RuleTypeParams = never> = Omit<
  AlertingSanitizedRule<Params>,
  'alertTypeId' | 'actions' | 'systemActions'
> & {
  ruleTypeId: AlertingSanitizedRule['alertTypeId'];
  actions: RuleUiAction[];
};

type Rule<Params extends RuleTypeParams = RuleTypeParams> = SanitizedRule<Params>;

export type InitialRule = Partial<Rule> &
  Pick<Rule, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags'>;

export interface RuleTypeParamsExpressionProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData = Record<string, unknown>,
  ActionGroupIds extends string = string
> {
  id?: string;
  ruleParams: Params;
  ruleInterval: string;
  ruleThrottle: string;
  alertNotifyWhen: RuleNotifyWhenType;
  setRuleParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  setRuleProperty: <Prop extends keyof Rule>(
    key: Prop,
    value: SanitizedRule<Params>[Prop] | null
  ) => void;
  onChangeMetaData: (metadata: MetaData) => void;
  errors: RuleFormErrors;
  defaultActionGroupId: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  metadata?: MetaData;
  charts: ChartsPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface RuleTypeModel<Params extends RuleTypeParams = RuleTypeParams> {
  id: string;
  description: string;
  iconClass: string;
  documentationUrl: string | ((docLinks: DocLinksStart) => string) | null;
  validate: (ruleParams: Params, isServerless?: boolean) => ValidationResult;
  ruleParamsExpression:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<RuleTypeParamsExpressionProps<Params>>>;
  requiresAppContext: boolean;
  defaultActionMessage?: string;
  defaultRecoveryMessage?: string;
  defaultSummaryMessage?: string;
  alertDetailsAppSection?:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<any>>;
}

export interface RuleFormData<Params extends RuleTypeParams = RuleTypeParams> {
  id?: SanitizedRule<Params>['id'];
  name: SanitizedRule<Params>['name'];
  tags: SanitizedRule<Params>['tags'];
  params: SanitizedRule<Params>['params'];
  schedule: SanitizedRule<Params>['schedule'];
  consumer: SanitizedRule<Params>['consumer'];
  alertDelay?: SanitizedRule<Params>['alertDelay'];
  notifyWhen?: SanitizedRule<Params>['notifyWhen'];
  ruleTypeId?: SanitizedRule<Params>['ruleTypeId'];
}

export interface RuleFormPlugins {
  http: HttpStart;
  charts: ChartsPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  docLinks: DocLinksStart;
}

export interface RuleFormState<Params extends RuleTypeParams = RuleTypeParams> {
  formData: RuleFormData<Params>;
  plugins: RuleFormPlugins;
  errors?: RuleFormErrors;
  selectedRuleTypeModel: RuleTypeModel<Params>;
  metadata?: Record<string, unknown>;
  minimumScheduleInterval?: MinimumScheduleInterval;
  canShowConsumerSelection?: boolean;
}

export interface RuleFormCommonProps {
  metadata?: Record<string, unknown>;
  plugins: RuleFormPlugins;
  ruleType: RuleTypeWithDescription;
  ruleTypeModel: RuleTypeModel;
  hideInterval?: boolean;
  onCancel: () => void;
}
