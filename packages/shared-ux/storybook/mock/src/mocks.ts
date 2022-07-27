/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ArgTypes, Args } from '@storybook/react';

const setTableCategory = <T extends ArgTypes>(args: T, category: 'Props' | 'Services') => {
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

export type ArgumentParams<PropArguments, ServiceArguments = {}> = Record<
  keyof PropArguments | keyof ServiceArguments,
  any
>;

export abstract class AbstractStorybookMock<
  Props extends Args,
  Services extends Args,
  PropArguments extends Args = {},
  ServiceArguments extends Args = {}
> {
  abstract readonly propArguments: ArgTypes<PropArguments>;
  abstract readonly serviceArguments: ArgTypes<ServiceArguments>;
  abstract readonly dependencies: Array<AbstractStorybookMock<Args, Partial<Services>>>;

  getPropArgumentTypes(): ArgTypes<PropArguments> {
    return setTableCategory(this.propArguments, 'Props');
  }

  getServiceArgumentTypes(): ArgTypes<ServiceArguments & ArgTypes> {
    const dependencyArgs = this.dependencies
      .map((d) => d.getServiceArgumentTypes())
      .filter((deps) => Object.keys(deps).length > 0)
      .reduce((acc, deps) => ({ ...acc, ...deps }), {});

    return {
      ...setTableCategory(this.serviceArguments, 'Services'),
      ...dependencyArgs,
    };
  }

  getArgumentTypes() {
    return {
      ...this.getPropArgumentTypes(),
      ...this.getServiceArgumentTypes(),
    };
  }

  protected getArgumentValue(
    arg: keyof PropArguments | keyof ServiceArguments,
    params?: ArgumentParams<PropArguments, ServiceArguments>
  ) {
    return params && params[arg] !== undefined
      ? params[arg]
      : this.getArgumentTypes()[arg].defaultValue;
  }

  abstract getProps(params?: ArgumentParams<PropArguments>): Props;
  abstract getServices(params?: ArgumentParams<PropArguments, ServiceArguments>): Services;
}
