/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flightFields, getFlightSearchOptions } from './flights';
import { OptionsListEmbeddableFactory } from '../control_types/options_list';
import { InputControlFactory, PresentationControlsService } from '../../../services/controls';

export const populateStorybookControlFactories = (
  controlsServiceStub: PresentationControlsService
) => {
  const optionsListFactoryStub = new OptionsListEmbeddableFactory(
    ({ field, search }) =>
      new Promise((r) => setTimeout(() => r(getFlightSearchOptions(field.name, search)), 120)),
    () =>
      Promise.resolve([
        {
          title: 'demo data flights',
          fields: [],
        },
      ]),
    () => Promise.resolve(flightFields)
  );

  // cast to unknown because the stub cannot use the embeddable start contract to transform the EmbeddableFactoryDefinition into an EmbeddableFactory
  const optionsListControlFactory = optionsListFactoryStub as unknown as InputControlFactory;
  optionsListControlFactory.getDefaultInput = () => ({});
  controlsServiceStub.registerInputControlType(optionsListControlFactory);
};
