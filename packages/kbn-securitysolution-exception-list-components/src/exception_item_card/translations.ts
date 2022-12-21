/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const exceptionItemCardEditButton = (listType: string) =>
  i18n.translate('exceptionList-components.exceptions.exceptionItem.card.editItemButton', {
    values: { listType },
    defaultMessage: 'Edit {listType} exception',
  });

export const exceptionItemCardDeleteButton = (listType: string) =>
  i18n.translate('exceptionList-components.exceptions.exceptionItem.card.deleteItemButton', {
    values: { listType },
    defaultMessage: 'Delete {listType} exception',
  });

export const EXCEPTION_ITEM_CARD_CREATED_LABEL = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.createdLabel',
  {
    defaultMessage: 'Created',
  }
);

export const EXCEPTION_ITEM_CARD_UPDATED_LABEL = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.updatedLabel',
  {
    defaultMessage: 'Updated',
  }
);

export const EXCEPTION_ITEM_CARD_META_BY = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.metaDetailsBy',
  {
    defaultMessage: 'by',
  }
);

export const exceptionItemCardCommentsAccordion = (comments: number) =>
  i18n.translate('exceptionList-components.exceptions.exceptionItem.card.showCommentsLabel', {
    values: { comments },
    defaultMessage: 'Show {comments, plural, =1 {comment} other {comments}} ({comments})',
  });

export const CONDITION_OPERATOR_TYPE_MATCH = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.matchOperator',
  {
    defaultMessage: 'IS',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.matchOperator.not',
  {
    defaultMessage: 'IS NOT',
  }
);

export const CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.wildcardMatchesOperator',
  {
    defaultMessage: 'MATCHES',
  }
);

export const CONDITION_OPERATOR_TYPE_WILDCARD_DOES_NOT_MATCH = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.wildcardDoesNotMatchOperator',
  {
    defaultMessage: 'DOES NOT MATCH',
  }
);

export const CONDITION_OPERATOR_TYPE_NESTED = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.nestedOperator',
  {
    defaultMessage: 'has',
  }
);

export const CONDITION_OPERATOR_TYPE_MATCH_ANY = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.matchAnyOperator',
  {
    defaultMessage: 'is one of',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.matchAnyOperator.not',
  {
    defaultMessage: 'is not one of',
  }
);

export const CONDITION_OPERATOR_TYPE_EXISTS = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.existsOperator',
  {
    defaultMessage: 'exists',
  }
);

export const CONDITION_OPERATOR_TYPE_DOES_NOT_EXIST = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.existsOperator.not',
  {
    defaultMessage: 'does not exist',
  }
);

export const CONDITION_OPERATOR_TYPE_LIST = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.listOperator',
  {
    defaultMessage: 'included in',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_IN_LIST = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.listOperator.not',
  {
    defaultMessage: 'is not included in',
  }
);

export const CONDITION_AND = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.and',
  {
    defaultMessage: 'AND',
  }
);

export const CONDITION_OS = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.os',
  {
    defaultMessage: 'OS',
  }
);

export const OS_WINDOWS = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.windows',
  {
    defaultMessage: 'Windows',
  }
);

export const OS_LINUX = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.linux',
  {
    defaultMessage: 'Linux',
  }
);

export const OS_MAC = i18n.translate(
  'exceptionList-components.exceptions.exceptionItem.card.conditions.macos',
  {
    defaultMessage: 'Mac',
  }
);

export const AFFECTED_RULES = (numRules: number) =>
  i18n.translate('exceptionList-components.exceptions.card.exceptionItem.affectedRules', {
    values: { numRules },
    defaultMessage: 'Affects {numRules} {numRules, plural, =1 {rule} other {rules}}',
  });
