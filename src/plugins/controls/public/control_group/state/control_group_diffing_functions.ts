/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';

import { ControlGroupInput } from '../types';
import { getPanelsAreEqual } from '../../../common/control_group/control_group_persistence';

export interface DiffFunctionProps<Key extends keyof ControlGroupInput> {
  currentValue: ControlGroupInput[Key];
  lastValue: ControlGroupInput[Key];

  currentInput: ControlGroupInput;
  lastInput: ControlGroupInput;
}

export type ControlGroupDiffFunctions = {
  [key in keyof Partial<ControlGroupInput>]: (
    props: DiffFunctionProps<key>
  ) => boolean | Promise<boolean>;
};

export const isKeyEqual = (
  key: keyof ControlGroupInput,
  diffFunctionProps: DiffFunctionProps<typeof key>,
  diffingFunctions: ControlGroupDiffFunctions
) => {
  const propsAsNever = diffFunctionProps as never; // todo figure out why props has conflicting types in some constituents.
  const diffingFunction = diffingFunctions[key];
  if (diffingFunction) {
    return diffingFunction(propsAsNever);
  }
  return fastIsEqual(diffFunctionProps.currentValue, diffFunctionProps.lastValue);
};

/**
 * A collection of functions which diff individual keys of dashboard state. If a key is missing from this list it is
 * diffed by the default diffing function, fastIsEqual.
 */
export const unsavedChangesDiffingFunctions: ControlGroupDiffFunctions = {
  panels: ({ currentValue, lastValue }) => {
    return getPanelsAreEqual(currentValue, lastValue);
  },
};
