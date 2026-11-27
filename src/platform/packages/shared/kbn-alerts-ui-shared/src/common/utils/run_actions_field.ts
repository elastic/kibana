/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Form-only field behind the Run actions switch. Off means the connector only receives events:
 * the spec form serializer sends no authentication and no actions.
 */
export const RUN_ACTIONS_FIELD_PATH = '__internal__.runActions';

interface FormFieldsReader {
  getFields: () => Record<string, { value: unknown }>;
}

/** Whether the Run actions switch is present and off. */
export const isRunActionsOff = (form: FormFieldsReader): boolean =>
  form.getFields()[RUN_ACTIONS_FIELD_PATH]?.value === false;
