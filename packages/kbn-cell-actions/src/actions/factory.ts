/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CellAction } from '../types';

type ActionFactory = <C extends CellAction = CellAction>(extend: Partial<C>) => C;

export const createActionFactory = <P>(actionCreator: (params: P) => CellAction) => {
  return (params: P): ActionFactory => {
    const action = actionCreator(params);
    return <C extends CellAction = CellAction>(extend: Partial<C>) => {
      const { isCompatible: extendedIsCompatible, execute: extendedExecute, ...rest } = extend;

      let isCompatible = action.isCompatible;

      if (extendedIsCompatible) {
        if (extendedExecute) {
          isCompatible = extendedIsCompatible;
        } else {
          isCompatible = async (context) => {
            // call extended and default `isCompatible` to make sure the default `execute` will run properly
            return (await action.isCompatible(context)) && (await extendedIsCompatible(context));
          };
        }
      }

      const execute = extendedExecute ?? action.execute;

      return {
        ...(action as C),
        isCompatible,
        execute,
        ...rest,
      };
    };
  };
};
