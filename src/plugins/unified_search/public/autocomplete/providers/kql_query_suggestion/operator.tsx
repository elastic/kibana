/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { $Keys } from 'utility-types';
import { flatten } from 'lodash';

import { KqlQuerySuggestionProvider } from './types';
import { QuerySuggestionTypes } from '../../index';

const equalsText = (
  <FormattedMessage
    id="unifiedSearch.kueryAutocomplete.equalOperatorDescription.equalsText"
    defaultMessage="equals"
    description="Part of unifiedSearch.kueryAutocomplete.equalOperatorDescription. Full text: 'equals some value'"
  />
);
const lessThanOrEqualToText = (
  <FormattedMessage
    id="unifiedSearch.kueryAutocomplete.lessThanOrEqualOperatorDescription.lessThanOrEqualToText"
    defaultMessage="less than or equal to"
    description="Part of unifiedSearch.kueryAutocomplete.lessThanOrEqualOperatorDescription. Full text: 'is less than or equal to some value'"
  />
);
const greaterThanOrEqualToText = (
  <FormattedMessage
    id="unifiedSearch.kueryAutocomplete.greaterThanOrEqualOperatorDescription.greaterThanOrEqualToText"
    defaultMessage="greater than or equal to"
    description="Part of unifiedSearch.kueryAutocomplete.greaterThanOrEqualOperatorDescription. Full text: 'is greater than or equal to some value'"
  />
);
const lessThanText = (
  <FormattedMessage
    id="unifiedSearch.kueryAutocomplete.lessThanOperatorDescription.lessThanText"
    defaultMessage="less than"
    description="Part of unifiedSearch.kueryAutocomplete.lessThanOperatorDescription. Full text: 'is less than some value'"
  />
);
const greaterThanText = (
  <FormattedMessage
    id="unifiedSearch.kueryAutocomplete.greaterThanOperatorDescription.greaterThanText"
    defaultMessage="greater than"
    description="Part of unifiedSearch.kueryAutocomplete.greaterThanOperatorDescription. Full text: 'is greater than some value'"
  />
);
const existsText = (
  <FormattedMessage
    id="unifiedSearch.kueryAutocomplete.existOperatorDescription.existsText"
    defaultMessage="exists"
    description="Part of unifiedSearch.kueryAutocomplete.existOperatorDescription. Full text: 'exists in any form'"
  />
);

const operators = {
  ':': {
    description: (
      <FormattedMessage
        id="unifiedSearch.kueryAutocomplete.equalOperatorDescription"
        defaultMessage="{equals} some value"
        values={{ equals: <span className="kbnSuggestionItem__callout">{equalsText}</span> }}
        description="Full text: 'equals some value'. See
        'unifiedSearch.kueryAutocomplete.equalOperatorDescription.equalsText' for 'equals' part."
      />
    ),
    fieldTypes: [
      'string',
      'number',
      'number_range',
      'date',
      'date_range',
      'ip',
      'ip_range',
      'geo_point',
      'geo_shape',
      'boolean',
    ],
  },
  '<=': {
    description: (
      <FormattedMessage
        id="unifiedSearch.kueryAutocomplete.lessThanOrEqualOperatorDescription"
        defaultMessage="is {lessThanOrEqualTo} some value"
        values={{
          lessThanOrEqualTo: (
            <span className="kbnSuggestionItem__callout">{lessThanOrEqualToText}</span>
          ),
        }}
        description="Full text: 'is less than or equal to some value'. See
        'unifiedSearch.kueryAutocomplete.lessThanOrEqualOperatorDescription.lessThanOrEqualToText' for 'less than or equal to' part."
      />
    ),
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  '>=': {
    description: (
      <FormattedMessage
        id="unifiedSearch.kueryAutocomplete.greaterThanOrEqualOperatorDescription"
        defaultMessage="is {greaterThanOrEqualTo} some value"
        values={{
          greaterThanOrEqualTo: (
            <span className="kbnSuggestionItem__callout">{greaterThanOrEqualToText}</span>
          ),
        }}
        description="Full text: 'is greater than or equal to some value'. See
        'unifiedSearch.kueryAutocomplete.greaterThanOrEqualOperatorDescription.greaterThanOrEqualToText' for 'greater than or equal to' part."
      />
    ),
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  '<': {
    description: (
      <FormattedMessage
        id="unifiedSearch.kueryAutocomplete.lessThanOperatorDescription"
        defaultMessage="is {lessThan} some value"
        values={{ lessThan: <span className="kbnSuggestionItem__callout">{lessThanText}</span> }}
        description="Full text: 'is less than some value'. See
        'unifiedSearch.kueryAutocomplete.lessThanOperatorDescription.lessThanText' for 'less than' part."
      />
    ),
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  '>': {
    description: (
      <FormattedMessage
        id="unifiedSearch.kueryAutocomplete.greaterThanOperatorDescription"
        defaultMessage="is {greaterThan} some value"
        values={{
          greaterThan: <span className="kbnSuggestionItem__callout">{greaterThanText}</span>,
        }}
        description="Full text: 'is greater than some value'. See
        'unifiedSearch.kueryAutocomplete.greaterThanOperatorDescription.greaterThanText' for 'greater than' part."
      />
    ),
    fieldTypes: ['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'],
  },
  ': *': {
    description: (
      <FormattedMessage
        id="unifiedSearch.kueryAutocomplete.existOperatorDescription"
        defaultMessage="{exists} in any form"
        values={{ exists: <span className="kbnSuggestionItem__callout">{existsText}</span> }}
        description="Full text: 'exists in any form'. See
        'unifiedSearch.kueryAutocomplete.existOperatorDescription.existsText' for 'exists' part."
      />
    ),
    fieldTypes: undefined,
  },
};

type Operators = $Keys<typeof operators>;

const getOperatorByName = (operator: string) => operators[operator as Operators];
const getDescription = (operator: string) => <p>{getOperatorByName(operator).description}</p>;

export const setupGetOperatorSuggestions: KqlQuerySuggestionProvider = () => {
  return ({ dataViews }, { end, fieldName, nestedPath }) => {
    const allFields = flatten(
      dataViews.map((dataView) => {
        return dataView.fields.slice();
      })
    );
    const fullFieldName = nestedPath ? `${nestedPath}.${fieldName}` : fieldName;
    const fields = allFields
      .filter((field) => field.name === fullFieldName)
      .map((field) => {
        const matchingOperators = Object.keys(operators).filter((operator) => {
          const { fieldTypes } = getOperatorByName(operator);

          return !fieldTypes || fieldTypes.includes(field.type);
        });

        const suggestions = matchingOperators.map((operator) => ({
          type: QuerySuggestionTypes.Operator,
          text: operator + ' ',
          description: getDescription(operator),
          start: end,
          end,
        }));
        return suggestions;
      });

    return Promise.resolve(flatten(fields));
  };
};
