/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { KibanaField } from './kibana_context_type';

interface Arguments {
  name: string;
  type: string;
  script?: string;
}

export type ExpressionFunctionField = ExpressionFunctionDefinition<
  'field',
  null,
  Arguments,
  KibanaField
>;

export const fieldFunction: ExpressionFunctionField = {
  name: 'field',
  type: 'kibana_field',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.field.help', {
    defaultMessage: 'Create a Kibana field.',
  }),
  args: {
    name: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.functions.field.name.help', {
        defaultMessage: 'Name of the field',
      }),
    },
    type: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.functions.field.type.help', {
        defaultMessage: 'Type of the field',
      }),
    },
    script: {
      types: ['string'],
      help: i18n.translate('data.search.functions.field.script.help', {
        defaultMessage: 'A field script, in case the field is scripted.',
      }),
    },
  },

  fn(input, args) {
    return {
      type: 'kibana_field',
      spec: {
        name: args.name,
        type: args.type,
        scripted: args.script ? true : false,
        script: args.script,
      },
    } as KibanaField;
  },
};
