/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { ComponentType } from 'react';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  RuleNotifyWhenType,
  ActionGroup,
  SanitizedRule as AlertingSanitizedRule,
  SanitizedRuleAction as RuleAction,
  RuleSystemAction,
  ResolvedSanitizedRule,
} from '@kbn/alerting-types';
import { RuleType } from '@kbn/triggers-actions-ui-types';
import { PublicMethodsOf } from '@kbn/utility-types';
import { TypeRegistry } from '../type_registry';

export type RuleTypeWithDescription = RuleType<string, string> & { description?: string };

export type RuleTypeIndexWithDescriptions = Map<string, RuleTypeWithDescription>;

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

export type RuleUiAction = RuleAction | RuleSystemAction;

// In Triggers and Actions we treat all `Alert`s as `SanitizedRule<RuleTypeParams>`
// so the `Params` is a black-box of Record<string, unknown>
export type SanitizedRule<Params extends RuleTypeParams = never> = Omit<
  AlertingSanitizedRule<Params>,
  'alertTypeId' | 'actions' | 'systemActions'
> & {
  ruleTypeId: AlertingSanitizedRule['alertTypeId'];
  actions: RuleUiAction[];
};

export type ResolvedRule = Omit<
  ResolvedSanitizedRule<RuleTypeParams>,
  'alertTypeId' | 'actions' | 'systemActions'
> & {
  ruleTypeId: ResolvedSanitizedRule['alertTypeId'];
  actions: RuleUiAction[];
};

export type Rule<Params extends RuleTypeParams = RuleTypeParams> = SanitizedRule<Params>;

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

export type RuleTypeRegistryContract = PublicMethodsOf<TypeRegistry<RuleTypeModel>>;
