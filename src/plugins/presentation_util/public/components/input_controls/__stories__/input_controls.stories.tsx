/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { decorators } from './decorators';
import { getEuiSelectableOptions, flightFields, flightFieldLabels, FlightField } from './flights';
import { OptionsListEmbeddableFactory, OptionsListEmbeddable } from '../control_types/options_list';
import { ControlFrame } from '../control_frame/control_frame';

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
  const [embeddables, setEmbeddables] = useState<OptionsListEmbeddable[]>([]);

  const optionsListEmbeddableFactory = useMemo(
    () =>
      new OptionsListEmbeddableFactory(
        ({ field, search }) =>
          new Promise((r) => setTimeout(() => r(getEuiSelectableOptions(field, search)), 500))
      ),
    []
  );

  useEffect(() => {
    const embeddableCreatePromises = fields.map((field) => {
      return optionsListEmbeddableFactory.create({
        field,
        id: '',
        indexPattern: '',
        multiSelect: true,
        twoLineLayout: twoLine,
        title: flightFieldLabels[field as FlightField],
      });
    });
    Promise.all(embeddableCreatePromises).then((newEmbeddables) => setEmbeddables(newEmbeddables));
  }, [fields, optionsListEmbeddableFactory, twoLine]);

  return (
    <EuiFlexGroup alignItems="center" wrap={true} gutterSize={'s'}>
      {embeddables.map((embeddable) => (
        <EuiFlexItem key={embeddable.getInput().field}>
          <ControlFrame twoLine={twoLine} embeddable={embeddable} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const OptionsListStory = ({ fields, twoLine }: OptionsListStorybookArgs) => (
  <OptionsListStoryComponent fields={fields} twoLine={twoLine} />
);

OptionsListStory.args = storybookArgs;
OptionsListStory.argTypes = storybookArgTypes;
