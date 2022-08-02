/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OptionsListEmbeddableFactory } from '../control_types/options_list';
import { RangeSliderEmbeddableFactory } from '../control_types/range_slider';
import { TimesliderEmbeddableFactory } from '../control_types/time_slider';
import { ControlsService } from '../services/controls';
import { ControlFactory } from '..';

export const populateStorybookControlFactories = (controlsServiceStub: ControlsService) => {
  const optionsListFactoryStub = new OptionsListEmbeddableFactory();

  // cast to unknown because the stub cannot use the embeddable start contract to transform the EmbeddableFactoryDefinition into an EmbeddableFactory
  const optionsListControlFactory = optionsListFactoryStub as unknown as ControlFactory;
  optionsListControlFactory.getDefaultInput = () => ({});
  controlsServiceStub.registerControlType(optionsListControlFactory);

  const rangeSliderFactoryStub = new RangeSliderEmbeddableFactory();

  // cast to unknown because the stub cannot use the embeddable start contract to transform the EmbeddableFactoryDefinition into an EmbeddableFactory
  const rangeSliderControlFactory = rangeSliderFactoryStub as unknown as ControlFactory;
  rangeSliderControlFactory.getDefaultInput = () => ({});
  controlsServiceStub.registerControlType(rangeSliderControlFactory);

  const timesliderFactoryStub = new TimesliderEmbeddableFactory();
  const timeSliderControlFactory = timesliderFactoryStub as unknown as ControlFactory;
  timeSliderControlFactory.getDefaultInput = () => ({});
  controlsServiceStub.registerControlType(timeSliderControlFactory);
};
