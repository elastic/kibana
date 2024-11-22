/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CellAction, CellActionExtend, CellActionFactory, CellActionTemplate } from '../types';

export const createCellActionFactory = <C extends CellAction = CellAction, P = void>(
  actionCreator: (params: P) => CellActionTemplate<C>
) => {
  return (params: P): CellActionFactory<C> => {
    const action = actionCreator(params);
    return createFactory(action);
  };
};

const createFactory = <C extends CellAction>(
  actionTemplate: CellActionTemplate<C>
): CellActionFactory<C> => {
  const factory = <A extends C = C>(extend: CellActionExtend<A>): A =>
    extendAction<A>(actionTemplate, extend);

  factory.combine = <A extends C = C>(
    partialActionTemplate: Partial<CellActionTemplate<A>>
  ): CellActionFactory<A> => {
    const combinedActions = extendActionTemplate(actionTemplate, partialActionTemplate);
    return createFactory(combinedActions);
  };

  return factory;
};

// extends the template to create another template
const extendActionTemplate = <C extends CellAction>(
  action: CellActionTemplate,
  extend: Partial<CellActionTemplate<C>>
): CellActionTemplate<C> => _extendAction<CellActionTemplate<C>>(action, extend);

// extends the template to create a full action (with id)
const extendAction = <C extends CellAction = CellAction>(
  action: CellActionTemplate,
  extend: CellActionExtend<C>
): C => _extendAction<C>(action, extend);

const _extendAction = <C extends Partial<CellAction>>(
  actionTemplate: CellActionTemplate,
  extend: Partial<C>
): C => {
  const { isCompatible: extendedIsCompatible, execute: extendedExecute, ...rest } = extend;

  let isCompatible = actionTemplate.isCompatible;
  if (extendedIsCompatible) {
    if (extendedExecute) {
      isCompatible = extendedIsCompatible;
    } else {
      isCompatible = async (context) => {
        // call extended and default `isCompatible` to make sure the default `execute` will run properly
        if (!(await actionTemplate.isCompatible(context))) {
          return false;
        }
        return extendedIsCompatible(context);
      };
    }
  }

  const execute = extendedExecute ?? actionTemplate.execute;

  return {
    ...(actionTemplate as C),
    isCompatible,
    execute,
    ...rest,
  };
};
