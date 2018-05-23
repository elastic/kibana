import { getKbnTypeNames } from '../../../../../../../../utils';

export const FIELD_TYPES_BY_LANG = {
  painless: ['number', 'string', 'date', 'boolean'],
  expression: ['number'],
};

export const DEFAULT_FIELD_TYPES = getKbnTypeNames();
