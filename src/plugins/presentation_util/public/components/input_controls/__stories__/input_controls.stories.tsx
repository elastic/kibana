/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { decorators } from './decorators';
import { getEuiSelectableOptions, flightFields } from './flights';
import { OptionsListEmbeddableFactory } from '../control_types/options_list';
import { ControlGroupComponent } from '../control_group/control_group_component';

export default {
  title: 'Input Controls',
  description: '',
  decorators,
};

interface OptionsListStorybookArgs {
  fields: string[];
  twoLine: boolean;
}

const storybookArgs = {
  twoLine: false,
  fields: ['OriginCityName', 'OriginWeather', 'DestCityName', 'DestWeather'],
};

const storybookArgTypes = {
  fields: {
    twoLine: {
      control: { type: 'bool' },
    },
    control: {
      type: 'check',
      options: flightFields,
    },
  },
};

const OptionsListStoryComponent = ({ fields, twoLine }: OptionsListStorybookArgs) => {
  const optionsListEmbeddableFactory = useMemo(
    () =>
      new OptionsListEmbeddableFactory(
        ({ field, search }) =>
          new Promise((r) => setTimeout(() => r(getEuiSelectableOptions(field, search)), 500))
      ),
    []
  );

  return (
    <ControlGroupComponent
      embeddableFactory={optionsListEmbeddableFactory}
      twoLine={twoLine}
      fields={fields}
    />
  );
};

export const OptionsListStory = ({ fields, twoLine }: OptionsListStorybookArgs) => (
  <OptionsListStoryComponent fields={fields} twoLine={twoLine} />
);

OptionsListStory.args = storybookArgs;
OptionsListStory.argTypes = storybookArgTypes;
