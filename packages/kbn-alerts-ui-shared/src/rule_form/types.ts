/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { AlertConsumers, RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import type { ComponentType } from 'react';

export interface ValidationResult {
  errors: Record<string, any>;
}
export interface IErrorObject {
  [key: string]: string | string[] | IErrorObject;
}

type RuleTypeParams = Record<string, unknown>;

// Just declare plugin names here. Actual types are defined in the plugins, and we
// can't import them here because of circular dependencies.
export interface RuleTypeParamsExpressionPlugins {
  charts: unknown;
  data: unknown;
  dataViews: unknown;
  unifiedSearch: unknown;
}

export interface RuleTypeParamsExpressionProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData = Record<string, unknown>,
  ActionGroupIds extends string = string
> extends RuleTypeParamsExpressionPlugins {
  id?: string;
  ruleParams: Params;
  ruleInterval: string;
  ruleThrottle: string;
  alertNotifyWhen: RuleNotifyWhenType;
  setRuleParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  /*
   * @deprecated
   */
  setRuleProperty: <Prop extends keyof Rule>(
    key: 'params',
    value: SanitizedRule<Params>[Prop] | null
  ) => void;
  onChangeMetaData: (metadata: MetaData) => void;
  errors: IErrorObject;
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
  validate: (ruleParams: Params) => ValidationResult;
  ruleParamsExpression:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<RuleTypeParamsExpressionProps<Params>>>;
  defaultActionMessage?: string;
  defaultRecoveryMessage?: string;
  defaultSummaryMessage?: string;
}

export interface RuleFormConfig {
  isUsingSecurity: boolean;
  minimumScheduleInterval?: {
    value: string;
    enforce: boolean;
  };
}
export interface RuleFormAppContext {
  consumer: RuleCreationValidConsumer;
  validConsumers?: RuleCreationValidConsumer[];
  canShowConsumerSelection?: boolean;
}
