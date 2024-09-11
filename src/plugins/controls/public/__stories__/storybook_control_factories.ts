/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OptionsListEmbeddableFactory } from '../options_list';
import { RangeSliderEmbeddableFactory } from '../range_slider';
import { TimeSliderEmbeddableFactory } from '../time_slider';
import { ControlsServiceType } from '../services/controls/types';
import { ControlFactory } from '../types';

export const populateStorybookControlFactories = (controlsServiceStub: ControlsServiceType) => {
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

  const timesliderFactoryStub = new TimeSliderEmbeddableFactory();
  const timeSliderControlFactory = timesliderFactoryStub as unknown as ControlFactory;
  timeSliderControlFactory.getDefaultInput = () => ({});
  controlsServiceStub.registerControlType(timeSliderControlFactory);
};
