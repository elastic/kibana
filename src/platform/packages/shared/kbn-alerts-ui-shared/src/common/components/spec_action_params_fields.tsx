/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormGeneratorFieldContext, generateFormFields } from '@kbn/response-ops-form-generator';
import { getMeta, setMeta } from '@kbn/connector-specs';
import type { ActionVariable, RuleActionParam } from '@kbn/alerting-types';
import type { z } from '@kbn/zod/v4';
import { AddMessageVariables } from '../../add_message_variables';
import type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';
import type { ActionParamsProps } from '../types';
import type { SpecActionParams } from '../types/spec_action_params';
import {
  getSpecActionInputSchema,
  getSpecDefaultSubAction,
} from '../utils/spec_action_params_schema';

const SpecActionParamsForm: React.FC<{
  schema: z.ZodObject<z.ZodRawShape>;
  defaultValue: Record<string, unknown>;
  disabled?: boolean;
  editAction: ActionParamsProps<SpecActionParams>['editAction'];
  index: number;
  messageField?: string;
  defaultMessage?: string;
  useDefaultMessage?: boolean;
  messageVariables?: ActionVariable[];
}> = ({
  schema,
  defaultValue,
  disabled,
  editAction,
  index,
  messageField,
  defaultMessage,
  useDefaultMessage,
  messageVariables,
}) => {
  const { form } = useForm({ defaultValue });
  const lastEmittedRef = useRef<unknown>(defaultValue);

  useEffect(() => {
    const subscription = form.subscribe(({ data }) => {
      const next = data.format() as RuleActionParam;
      if (isEqual(next, lastEmittedRef.current)) {
        return;
      }
      lastEmittedRef.current = next;
      editAction('subActionParams', next, index);
    });
    return () => subscription.unsubscribe();
  }, [editAction, form, index]);

  useEffect(() => {
    if (!messageField || defaultMessage === undefined) {
      return;
    }
    const current = form.getFormData()?.[messageField];
    if (useDefaultMessage || current === undefined || current === null || current === '') {
      form.setFieldValue(messageField, defaultMessage);
    }
  }, [defaultMessage, form, messageField, useDefaultMessage]);

  const renderLabelAppend = useCallback(
    ({
      path,
      currentValue,
      setValue,
    }: {
      path: string;
      currentValue: unknown;
      setValue: (value: string) => void;
    }) => (
      <AddMessageVariables
        messageVariables={messageVariables}
        paramsProperty={path}
        onSelectEventHandler={(variable) =>
          setValue(`${typeof currentValue === 'string' ? currentValue : ''}{{${variable.name}}}`)
        }
      />
    ),
    [messageVariables]
  );

  const fieldContextValue = useMemo(() => ({ renderLabelAppend }), [renderLabelAppend]);

  return (
    <FormGeneratorFieldContext.Provider value={fieldContextValue}>
      <Form form={form}>
        {generateFormFields({
          schema,
          formConfig: { disabled },
          metaFunctions: { getMeta, setMeta },
        })}
      </Form>
    </FormGeneratorFieldContext.Provider>
  );
};

export const bindSpecActionParamsFields = (
  spec: ConnectorSpecResponse
): React.FC<ActionParamsProps<SpecActionParams>> => {
  return function BoundSpecActionParamsFields(props) {
    return <SpecActionParamsFields {...props} spec={spec} />;
  };
};

export const SpecActionParamsFields: React.FC<
  ActionParamsProps<SpecActionParams> & { spec: ConnectorSpecResponse }
> = ({
  spec,
  actionParams,
  editAction,
  index,
  isDisabled,
  messageVariables,
  defaultMessage,
  useDefaultMessage,
}) => {
  const actionNames = Object.keys(spec.actions);
  const defaultSubAction = getSpecDefaultSubAction(spec);
  const subAction = actionParams.subAction ?? defaultSubAction;
  const schema = useMemo(
    () => (subAction ? getSpecActionInputSchema(spec, subAction) : undefined),
    [spec, subAction]
  );

  useEffect(() => {
    if (!actionParams.subAction && defaultSubAction) {
      editAction('subAction', defaultSubAction, index);
    }
  }, [actionParams.subAction, defaultSubAction, editAction, index]);

  const actionOptions = useMemo(
    () =>
      actionNames.map((name) => ({
        value: name,
        inputDisplay: spec.actions[name].description
          ? `${name} — ${spec.actions[name].description}`
          : name,
      })),
    [actionNames, spec.actions]
  );

  return (
    <>
      {actionNames.length > 1 && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('alertsUIShared.specActionParams.actionLabel', {
            defaultMessage: 'Action',
          })}
        >
          <EuiSuperSelect
            fullWidth
            options={actionOptions}
            valueOfSelected={subAction}
            disabled={isDisabled}
            data-test-subj="specActionParams-subAction"
            onChange={(value) => {
              editAction('subAction', value, index);
              editAction('subActionParams', {}, index);
            }}
          />
        </EuiFormRow>
      )}
      {schema && (
        <SpecActionParamsForm
          key={subAction}
          schema={schema}
          defaultValue={actionParams.subActionParams ?? {}}
          disabled={isDisabled}
          editAction={editAction}
          index={index}
          messageField={spec.alerting?.messageField}
          defaultMessage={defaultMessage}
          useDefaultMessage={useDefaultMessage}
          messageVariables={messageVariables}
        />
      )}
    </>
  );
};
