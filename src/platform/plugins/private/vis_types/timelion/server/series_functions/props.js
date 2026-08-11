/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { set } from '@kbn/safer-lodash-set';
import alter from '../lib/alter';
import Chainable from '../lib/classes/chainable';
import _ from 'lodash';

const FORBIDDEN_TOP_LEVEL_SERIES_KEYS = new Set(['data', 'type']);
const FORBIDDEN_TOP_LEVEL_SERIES_LIST_KEYS = new Set(['list', 'type']);
const FORBIDDEN_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor', 'length']);

const INVALID_PROP_NAME_ERROR = i18n.translate('timelion.serverSideErrors.props.invalidKey', {
  defaultMessage: 'Invalid property name passed to props()',
});

const getForbiddenKeyErrorMsg = (key) =>
  i18n.translate('timelion.serverSideErrors.props.forbiddenKey', {
    defaultMessage: 'Setting "{key}" via props() is not allowed',
    values: { key },
  });

function assertSafePropsKey(key, { global }) {
  if (!key || typeof key !== 'string' || key.trim() === '') {
    throw new Error(INVALID_PROP_NAME_ERROR);
  }

  const path = _.toPath(key);

  if (path.length === 0 || path.some((segment) => segment == null || segment === '')) {
    throw new Error(INVALID_PROP_NAME_ERROR);
  }

  if (path.some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment))) {
    throw new Error(getForbiddenKeyErrorMsg(key));
  }

  // Prevent array-like writes (eg `foo[2147483647]=...`) which can lead to OOM/hangs.
  if (path.some((segment) => typeof segment === 'string' && /^\d+$/.test(segment))) {
    throw new Error(getForbiddenKeyErrorMsg(key));
  }

  const topLevel = path[0];
  const forbiddenTopLevel = global
    ? FORBIDDEN_TOP_LEVEL_SERIES_LIST_KEYS
    : FORBIDDEN_TOP_LEVEL_SERIES_KEYS;
  if (forbiddenTopLevel.has(topLevel)) {
    throw new Error(getForbiddenKeyErrorMsg(key));
  }
}

export default new Chainable('props', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'global',
      types: ['boolean', 'null'],
      help: i18n.translate('timelion.help.functions.props.args.globalHelpText', {
        defaultMessage: 'Set props on the seriesList vs on each series',
      }),
    },
  ],
  extended: {
    types: ['seriesList', 'number', 'string', 'boolean', 'null'],
    // Extended args can not currently be multivalued,
    // multi: false is not required and is shown here for demonstration purposes
    multi: false,
  },
  // extended means you can pass arguments that aren't listed. They just won't be in the ordered array
  // They will be passed as args._extended:{}
  help: i18n.translate('timelion.help.functions.propsHelpText', {
    defaultMessage:
      'Use at your own risk, sets arbitrary properties on the series. For example {example}',
    values: {
      example: '.props(label=bears!)',
    },
  }),
  fn: function firstFn(args) {
    const propertyAssignments = _.omit(args.byName, 'inputSeries', 'global');
    const isGlobal = Boolean(args.byName.global);

    if (isGlobal) {
      _.each(propertyAssignments, (value, key) => {
        assertSafePropsKey(key, { global: true });
        set(args.byName.inputSeries, _.toPath(key), value);
      });
      return args.byName.inputSeries;
    } else {
      return alter(args, function (eachSeries) {
        _.each(propertyAssignments, (value, key) => {
          assertSafePropsKey(key, { global: false });
          set(eachSeries, _.toPath(key), value);
        });
        return eachSeries;
      });
    }
  },
});
