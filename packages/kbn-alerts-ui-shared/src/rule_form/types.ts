/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ComponentType } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { AlertConsumers, RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import type { RuleFormValidationError } from './common/validation_error';
import { RuleDefinitionValidation, RuleDetailsValidation } from './features';

export interface RuleFormRule {
  id: string;
  name: string;
  tags: string[];
  consumer: AlertConsumers | 'alerts' | null;
  schedule: { interval: string };
  params: RuleTypeParams;
  alertDelay?: {
    active: number;
  };
  actions: [];
  ruleTypeId: string;
}

export interface RuleFormKibanaServices {
  http: HttpStart;
  toasts: ToastsStart;
}

export type RuleTypeParams = Record<string, unknown>;

// Just declare plugin names here. Actual types are defined in the plugins, and we
// can't import them here because of circular dependencies.
export interface RuleTypeParamsExpressionPlugins {
  charts: unknown;
  data: unknown;
  dataViews: unknown;
  unifiedSearch: unknown;
}

export interface ActionGroup<ActionGroupIds extends string> {
  id: ActionGroupIds;
  name: string;
}

export interface RuleTypeParamsExpressionProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData = Record<string, unknown>,
  ActionGroupIds extends string = string
> extends RuleTypeParamsExpressionPlugins {
  id?: string;
  ruleParams: Params;
  ruleInterval: string;
  setRuleParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  /**
   * @deprecated Use setRuleParams instead
   */
  setRuleProperty: <Prop extends keyof RuleFormRule>(
    key: 'params',
    value: Record<string, unknown>
  ) => void;
  onChangeMetaData: (metadata: MetaData) => void;
  errors: RuleFormValidationErrorObject | RuleFormValidationErrorList | IErrorObject;
  defaultActionGroupId: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  metadata?: MetaData;
}

export interface RuleTypeModel<Params extends RuleTypeParams = RuleTypeParams> {
  id: string;
  name: string;
  authorizedConsumers?: Record<AlertConsumers, { read: boolean; all: boolean }>;
  description: string;
  iconClass: string;
  documentationUrl: string | ((docLinks: DocLinksStart) => string) | null;
  validate: (ruleParams: Params) => RuleFormValidationResult | V1ValidationResult;
  ruleParamsExpression:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<RuleTypeParamsExpressionProps<Params>>>;
  defaultActionMessage?: string;
  defaultRecoveryMessage?: string;
  defaultSummaryMessage?: string;
  defaultRuleParams?: Params;
}

export type RuleTypeModelFromRegistry<Params extends RuleTypeParams = RuleTypeParams> = Omit<
  RuleTypeModel<Params>,
  'name' | 'authorizedConsumers'
>;

export interface RuleFormConfig {
  isUsingSecurity: boolean;
  minimumScheduleInterval?: {
    value: string;
    enforce: boolean;
  };
}
export interface RuleFormAppContext {
  consumer?: RuleCreationValidConsumer;
  validConsumers?: RuleCreationValidConsumer[];
  canShowConsumerSelection?: boolean;
}

export type { RuleFormValidationError };
export type RuleFormValidationErrorList = RuleFormValidationError[];
export interface RuleFormValidationErrorObject {
  [key: string]: RuleFormValidationErrorList | RuleFormValidationErrorObject;
}
export interface RuleFormValidationResult {
  errors: RuleFormValidationErrorObject | RuleFormValidationErrorList;
}
/** @deprecated Use RuleFormValidationResult instead */
export interface V1ValidationResult {
  errors: IErrorObject | string | string[];
}

/**
 * @deprecated Use RuleFormValidationErrorObject instead
 */
export interface IErrorObject {
  [key: string]: string | string[] | IErrorObject;
}

export interface RuleFormStateValidation {
  ruleDefinition: RuleDefinitionValidation;
  ruleDetails: RuleDetailsValidation;
  isOverallValid: boolean;
}
