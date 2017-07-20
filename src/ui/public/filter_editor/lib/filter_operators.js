import _ from 'lodash';

export const FILTER_OPERATORS = [
  {
    name: 'is',
    type: 'phrase',
    negate: false,
  },
  {
    name: 'is not',
    type: 'phrase',
    negate: true,
  },
  {
    name: 'is one of',
    type: 'phrases',
    negate: false,
  },
  {
    name: 'is not one of',
    type: 'phrases',
    negate: true,
  },
  {
    name: 'is between',
    type: 'range',
    negate: false,
    fieldTypes: ['number', 'date', 'ip'],
  },
  {
    name: 'is not between',
    type: 'range',
    negate: true,
    fieldTypes: ['number', 'date', 'ip'],
  },
  {
    name: 'exists',
    type: 'exists',
    negate: false,
  },
  {
    name: 'does not exist',
    type: 'exists',
    negate: true,
  },
];

export const FILTER_OPERATOR_TYPES = _(FILTER_OPERATORS)
  .map('type')
  .uniq()
  .value();
