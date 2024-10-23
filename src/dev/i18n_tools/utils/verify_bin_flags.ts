/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';
import chalk from 'chalk';
import _ from 'lodash';

const i18nErrorTag = chalk.white.bgRed(' I18N ERROR ');

export const flagFailError = (message: string) => {
  throw createFailError(`${i18nErrorTag} ${message}`);
};

export const isDefined = _.negate(_.isUndefined);

export const undefinedOrBoolean = (flag: unknown): flag is boolean | undefined => {
  if (_.isUndefined(flag)) {
    return true;
  }
  return _.isBoolean(flag);
};

export const undefinedOrString = (flag: unknown): flag is boolean | undefined => {
  if (_.isUndefined(flag)) {
    return true;
  }
  return _.isBoolean(flag);
};
