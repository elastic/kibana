/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from '../translations';

export const OS_LABELS = Object.freeze({
  linux: i18n.OS_LINUX,
  mac: i18n.OS_MAC,
  macos: i18n.OS_MAC,
  windows: i18n.OS_WINDOWS,
});

export const OPERATOR_TYPE_LABELS_INCLUDED = Object.freeze({
  [ListOperatorTypeEnum.NESTED]: i18n.CONDITION_OPERATOR_TYPE_NESTED,
  [ListOperatorTypeEnum.MATCH_ANY]: i18n.CONDITION_OPERATOR_TYPE_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: i18n.CONDITION_OPERATOR_TYPE_MATCH,
  [ListOperatorTypeEnum.WILDCARD]: i18n.CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES,
  [ListOperatorTypeEnum.EXISTS]: i18n.CONDITION_OPERATOR_TYPE_EXISTS,
  [ListOperatorTypeEnum.LIST]: i18n.CONDITION_OPERATOR_TYPE_LIST,
});

export const OPERATOR_TYPE_LABELS_EXCLUDED = Object.freeze({
  [ListOperatorTypeEnum.MATCH_ANY]: i18n.CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY,
  [ListOperatorTypeEnum.MATCH]: i18n.CONDITION_OPERATOR_TYPE_NOT_MATCH,
  [ListOperatorTypeEnum.WILDCARD]: i18n.CONDITION_OPERATOR_TYPE_WILDCARD_DOES_NOT_MATCH,
  [ListOperatorTypeEnum.EXISTS]: i18n.CONDITION_OPERATOR_TYPE_DOES_NOT_EXIST,
  [ListOperatorTypeEnum.LIST]: i18n.CONDITION_OPERATOR_TYPE_NOT_IN_LIST,
});
