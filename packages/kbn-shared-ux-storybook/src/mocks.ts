/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ArgTypes } from '@storybook/react';

export type Params<Props, Services> = Record<
  keyof ArgTypes<ReturnType<AbstractStorybookMocks<Props, Services>['getArgumentTypes']>>,
  any
>;

export type ActionHandler = (name: string) => any;

const setTableCategory = <Props, Services>(
  args: Partial<ArgTypes<Props | Services>>,
  category: 'Props' | 'Services'
) => {
  const keys = Object.keys(args) as Array<keyof typeof args>;

  keys.forEach((key) => {
    const arg = args[key];

    args[key] = {
      ...arg,
      table: {
        ...(arg?.table || {}),
        category,
      },
    };
  });

  return args;
};

export abstract class AbstractStorybookMocks<Props, Services> {
  abstract propArguments: Partial<ArgTypes<Props>>;
  abstract serviceArguments: Partial<ArgTypes<Services>>;
  abstract dependencies: Array<AbstractStorybookMocks<unknown, unknown>>;

  getPropArgumentTypes() {
    return setTableCategory(this.propArguments, 'Props');
  }

  getServiceArgumentTypes(): Partial<ArgTypes<Services>> & Partial<ArgTypes<unknown>> {
    return {
      ...setTableCategory(this.serviceArguments, 'Services'),
      ...this.dependencies
        .map((dep) => dep.getServiceArgumentTypes())
        .filter((deps) => Object.keys(deps).length > 0),
    };
  }

  getArgumentTypes() {
    return {
      ...this.getPropArgumentTypes(),
      ...this.getServiceArgumentTypes(),
    };
  }

  abstract getServices(params?: Params<Props, Services>): Services;
}
