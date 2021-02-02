/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

// Applies to unresolved arguments in the AST
export default function repositionArguments(functionDef, unorderedArgs) {
  const args = [];

  _.each(unorderedArgs, function (unorderedArg, i) {
    let argDef;
    let targetIndex;
    let value;
    let storeAsArray;

    if (_.isObject(unorderedArg) && unorderedArg.type === 'namedArg') {
      argDef = functionDef.argsByName[unorderedArg.name];

      if (!argDef) {
        if (functionDef.extended) {
          const namesIndex = functionDef.args.length;
          targetIndex = functionDef.args.length + 1;

          args[namesIndex] = args[namesIndex] || [];
          args[namesIndex].push(unorderedArg.name);

          argDef = functionDef.extended;
          storeAsArray = true;
        }
      } else {
        targetIndex = _.findIndex(functionDef.args, function (orderedArg) {
          return unorderedArg.name === orderedArg.name;
        });
        storeAsArray = argDef.multi;
      }
      value = unorderedArg.value;
    } else {
      argDef = functionDef.args[i];
      storeAsArray = argDef.multi;
      targetIndex = i;
      value = unorderedArg;
    }

    if (!argDef) {
      throw new Error(
        i18n.translate('timelion.serverSideErrors.unknownArgumentErrorMessage', {
          defaultMessage: 'Unknown argument to {functionName}: {argumentName}',
          values: {
            functionName: functionDef.name,
            argumentName: unorderedArg.name || '#' + i,
          },
        })
      );
    }

    if (storeAsArray) {
      args[targetIndex] = args[targetIndex] || [];
      args[targetIndex].push(value);
    } else {
      args[targetIndex] = value;
    }
  });

  return args;
}
