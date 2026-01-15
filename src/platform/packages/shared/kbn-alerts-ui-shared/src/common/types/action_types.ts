/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, ReactNode } from 'react';
import type { RuleActionParam, ActionVariable } from '@kbn/alerting-types';
import type { IconType, RecursivePartial } from '@elastic/eui';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionType, SubFeature } from '@kbn/actions-types';
import type { SerializerFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionTypeSource } from '@kbn/actions-types';
import type { RuleFormParamsErrors } from './rule_types';
import type { TypeRegistry } from '../type_registry';

export interface GenericValidationResult<T> {
  errors: Record<Extract<keyof T, string>, string[] | unknown>;
}

export interface ConnectorValidationError {
  message: ReactNode;
}

export type ConnectorValidationFunc = () => Promise<ConnectorValidationError | void | undefined>;

export interface ActionConnectorFieldsProps {
  readOnly: boolean;
  isEdit: boolean;
  registerPreSubmitValidator: (validator: ConnectorValidationFunc) => void;
}

export interface ActionConnectorProps<Config, Secrets> {
  secrets: Secrets;
  id: string;
  actionTypeId: string;
  name: string;
  referencedByCount?: number;
  config: Config;
  isPreconfigured: boolean;
  isDeprecated: boolean;
  isSystemAction: boolean;
  isMissingSecrets?: boolean;
  isConnectorTypeDeprecated: boolean;
  source?: ActionTypeSource;
}

export type SystemAction = Omit<ActionConnectorProps<never, never>, 'config' | 'secrets'> & {
  isSystemAction: true;
  isPreconfigured: false;
};

export type PreConfiguredActionConnector = Omit<
  ActionConnectorProps<never, never>,
  'config' | 'secrets'
> & {
  isPreconfigured: true;
  isSystemAction: false;
};

export type UserConfiguredActionConnector<Config, Secrets> = ActionConnectorProps<
  Config,
  Secrets
> & {
  isPreconfigured: false;
  isSystemAction: false;
};

export type ActionConnector<Config = Record<string, unknown>, Secrets = Record<string, unknown>> =
  | PreConfiguredActionConnector
  | SystemAction
  | UserConfiguredActionConnector<Config, Secrets>;

export enum ActionConnectorMode {
  Test = 'test',
  ActionForm = 'actionForm',
}

export type ConnectorFormSchema<
  Config = Record<string, unknown>,
  Secrets = Record<string, unknown>
> = Pick<
  UserConfiguredActionConnector<Config, Secrets>,
  'actionTypeId' | 'isDeprecated' | 'config' | 'secrets'
> &
  Partial<Pick<UserConfiguredActionConnector<Config, Secrets>, 'id' | 'name'>>;

export type InternalConnectorForm = ConnectorFormSchema & {
  __internal__?: {
    headers?: Array<{ key: string; value: string; type: string }>;
  };
};

export interface ActionParamsProps<TParams> {
  actionParams: Partial<TParams>;
  index: number;
  editAction: (key: string, value: RuleActionParam, index: number) => void;
  errors: RuleFormParamsErrors;
  ruleTypeId?: string;
  messageVariables?: ActionVariable[];
  defaultMessage?: string;
  useDefaultMessage?: boolean;
  actionConnector?: ActionConnector;
  isLoading?: boolean;
  isDisabled?: boolean;
  selectedActionGroupId?: string;
  showEmailSubjectAndMessage?: boolean;
  executionMode?: ActionConnectorMode;
  onBlur?: (field?: string) => void;
  producerId?: string;
  featureId?: string;
}

export interface ActionReadOnlyElementProps {
  connectorId: string;
  connectorName: string;
}

export interface CustomConnectorSelectionItem {
  getText: (actionConnector: ActionConnector) => string;
  getComponent: (
    actionConnector: ActionConnector
  ) => React.LazyExoticComponent<ComponentType<{ actionConnector: ActionConnector }>> | undefined;
}

export interface ActionTypeModel<ActionConfig = any, ActionSecrets = any, ActionParams = any> {
  id: string;
  iconClass: IconType;
  selectMessage: string;
  selectMessagePreconfigured?: string;
  actionTypeTitle?: string;
  validateParams: (
    actionParams: ActionParams,
    connectorConfig: ActionConfig | null
  ) => Promise<GenericValidationResult<Partial<ActionParams> | unknown>>;
  actionConnectorFields: React.LazyExoticComponent<
    ComponentType<ActionConnectorFieldsProps>
  > | null;
  actionParamsFields: React.LazyExoticComponent<ComponentType<ActionParamsProps<ActionParams>>>;
  actionReadOnlyExtraComponent?: React.LazyExoticComponent<
    ComponentType<ActionReadOnlyElementProps>
  >;
  defaultActionParams?: RecursivePartial<ActionParams>;
  defaultRecoveredActionParams?: RecursivePartial<ActionParams>;
  customConnectorSelectItem?: CustomConnectorSelectionItem;
  isExperimental?: boolean;
  subtype?: Array<{ id: string; name: string }>;
  convertParamsBetweenGroups?: (params: ActionParams) => ActionParams | {};
  getHideInUi?: (actionTypes: ActionType[]) => boolean;
  source?: ActionTypeSource;
  modalWidth?: number;
  isSystemActionType?: boolean;
  subFeature?: SubFeature;
  /**
   * Connector form config
   */
  connectorForm?: {
    /**
     * Form hook lib deserializer used in the connector form
     * Use this to transform the connector object to an intermediate state used in the form
     */
    deserializer?: SerializerFunc<InternalConnectorForm, ConnectorFormSchema>;
    /**
     * Form hook lib serializer used in the connector form
     * Use this to transform the intermediate state used in the form into a connector object
     */
    serializer?: SerializerFunc<ConnectorFormSchema, InternalConnectorForm>;
    /**
     * If true, hides the settings title of the connector form
     * @default false
     */
    hideSettingsTitle?: boolean;
  };
}

export type ActionTypeRegistryContract<Connector = unknown, Params = unknown> = PublicMethodsOf<
  TypeRegistry<ActionTypeModel<Connector, Params>>
>;
