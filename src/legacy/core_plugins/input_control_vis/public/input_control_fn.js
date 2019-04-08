/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { functionsRegistry } from 'plugins/interpreter/registries';
import { i18n } from '@kbn/i18n';

export const inputControl = () => ({
  name: 'inputControl',
  type: 'input_control',
  context: {
    types: [],
  },
  help: i18n.translate('inputControl.function.inputControl.help', {
    defaultMessage: 'Generates input control configuration'
  }),
  args: {
    type: {
      types: ['string'],
      aliases: ['_'],
      required: true,
      options: ['range', 'list'],
    },
    id: {
      types: ['string'],
      required: true,
    },
    parent: {
      types: ['string'],
      default: '""',
    },
    label: {
      types: ['string'],
    },
    fieldName: {
      types: ['string'],
      required: true,
    },
    indexPattern: {
      types: ['string'],
      required: true,
    },
    dynamicOptions: {
      types: ['boolean'],
      default: false,
    },
    multiselect: {
      types: ['boolean'],
      default: false,
    },
    optionType: {
      types: ['string'],
      default: '"terms"',
    },
    optionSort: {
      types: ['string'],
      default: '"desc"',
    },
    optionSize: {
      types: ['number'],
      default: 5,
    },
    decimalPlaces: {
      types: ['number'],
      default: 0,
    },
    step: {
      types: ['number'],
      default: 1,
    }
  },
  fn(context, args) {
    const params = {
      id: args.id,
      type: args.type,
      fieldName: args.fieldName,
      indexPattern: args.indexPattern,
      parent: args.parent,
    };
    if (args.label) {
      params.label = args.label;
    }
    if (args.type === 'range') {
      params.options = {
        decimalPlaces: args.decimalPlaces,
        size: args.size,
      };
    } else {
      params.options = {
        dynamicOptions: args.dynamicOptions,
        multiselect: args.multiselect,
        type: args.optionType,
        sort: args.optionSort,
        size: args.optionSize,
      };
    }

    return {
      type: 'input_control',
      params,
    };
  }
});

functionsRegistry.register(inputControl);
