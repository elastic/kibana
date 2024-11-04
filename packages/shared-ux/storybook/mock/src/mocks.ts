/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ArgTypes, Args } from '@storybook/react';

/**
 * Sets the category for the argument in a consistent way throughout the dependency tree.
 */
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

/**
 * Type that expresses the arguments available to a story based on the
 * props and services the component consumes.
 */
export type ArgumentParams<PropArguments, ServiceArguments = {}> = Record<
  keyof PropArguments | keyof ServiceArguments,
  any
>;

/**
 * An abstract class that allows one to strictly define the arguments
 * and values for a component story in Storybook.
 */
export abstract class AbstractStorybookMock<
  /** The full props interface for a given compponent. */
  Props extends Args,
  /** The full services interface for a given compponent. */
  Services extends Args,
  /** The arguments for a story that will influence the prop values. */
  PropArguments extends Args = {},
  /** The arguments for a story that will influence the service values. */
  ServiceArguments extends Args = {}
> {
  /** Define the arguments for prop values in this object.
   *
   * For example:
   *
   * ```
   * propArguments = {
   *   someTextProp: {
   *     control: 'text',
   *     defaultValue: 'Elastic',
   *   },
   * };
   * ```
   */
  abstract readonly propArguments: ArgTypes<PropArguments>;

  /**
   * Define the arguments for service values in this object.
   *
   * For example:
   *
   * ```
   * serviceArguments = {
   *   isServiceTrue: {
   *     control: 'boolean',
   *     defaultValue: true,
   *   },
   * };
   * ```
   */
  abstract readonly serviceArguments: ArgTypes<ServiceArguments>;

  /** Provide dependency `StorybookMock` objects in this array. */
  abstract readonly dependencies: Array<AbstractStorybookMock<Args, Partial<Services>>>;

  /**
   * Returns the list of Storybook arguments pertaining to Props for a given story.
   * This collection will be unique to this component, and will not include any
   * props from dependencies.
   */
  protected getPropArgumentTypes(): ArgTypes<PropArguments> {
    return setTableCategory(this.propArguments, 'Props');
  }

  /**
   * Returns the list of Storybook arguments pertaining to Services for a given story.
   * This method will incorporate Service arguments from dependencies, as they are
   * included in a component's service interface.
   */
  protected getServiceArgumentTypes(): ArgTypes<ServiceArguments & ArgTypes> {
    const dependencyArgs = this.dependencies
      .map((d) => d.getServiceArgumentTypes())
      .filter((deps) => Object.keys(deps).length > 0)
      .reduce((acc, deps) => ({ ...acc, ...deps }), {});

    return {
      ...setTableCategory(this.serviceArguments, 'Services'),
      ...dependencyArgs,
    };
  }

  /**
   * Return a categorized list of Storybook arguments for a given component.
   */
  getArgumentTypes() {
    return {
      ...this.getPropArgumentTypes(),
      ...this.getServiceArgumentTypes(),
    };
  }

  /**
   * Given a collection of parameters, return either the value provided by the story,
   * or the default value for the argument definition.
   */
  protected getArgumentValue(
    arg: keyof PropArguments | keyof ServiceArguments,
    params?: ArgumentParams<PropArguments, ServiceArguments>
  ) {
    return params && params[arg] !== undefined
      ? params[arg]
      : this.getArgumentTypes()[arg].defaultValue;
  }

  /**
   * Return the props for a component for a story, given the parameters provided by
   * controls and their values within the story.
   */
  abstract getProps(params?: ArgumentParams<PropArguments>): Props;

  /**
   * Return the services for a component for a story, given the parameters provided by
   * controls and their values within the story.
   */
  abstract getServices(params?: ArgumentParams<PropArguments, ServiceArguments>): Services;
}
