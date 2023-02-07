/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CellAction } from '../types';

type Extend<C extends CellAction> = Partial<C> & {
  id: string; // id is required
};

export const createActionFactory = <P>(actionCreator: (params: P) => CellAction) => {
  return (params: P) =>
    <C extends CellAction>(extend: Extend<C>) => {
      const { isCompatible: extendedIsCompatible, execute: extendedExecute, ...rest } = extend;
      const action = actionCreator(params);

      let isCompatible = action.isCompatible;

      if (extendedIsCompatible) {
        if (extendedExecute) {
          isCompatible = extendedIsCompatible;
        } else {
          // if isCompatible is extended but execute is not, we have to call the default isCompatible along with
          // the extended (in can only be more restrictive), to make sure it won't break the default execute implementation
          isCompatible = async (context) => {
            return (await action.isCompatible(context)) && (await extendedIsCompatible(context));
          };
        }
      }

      const execute = extendedExecute ?? action.execute;

      return {
        ...action,
        isCompatible,
        execute,
        ...rest,
      };
    };
};
