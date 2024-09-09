/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RangeSliderEmbeddableInput } from '..';
import {
  ControlFactory,
  ControlOutput,
  RangeSliderEmbeddable,
  RangeSliderEmbeddableFactory,
} from '../../public';
import * as rangeSliderStateModule from '../../public/range_slider/range_slider_reducers';
import { RangeSliderComponentState } from '../../public/range_slider/types';

export const mockRangeSliderEmbeddableInput = {
  id: 'sample options list',
  fieldName: 'sample field',
  dataViewId: 'sample id',
  value: ['0', '10'],
} as RangeSliderEmbeddableInput;

const mockRangeSliderComponentState = {
  field: { name: 'bytes', type: 'number', aggregatable: true },
  min: undefined,
  max: undefined,
  error: undefined,
  isInvalid: false,
} as RangeSliderComponentState;

const mockRangeSliderOutput = {
  loading: false,
} as ControlOutput;

export const mockRangeSliderEmbeddable = async (partialState?: {
  explicitInput?: Partial<RangeSliderEmbeddableInput>;
  componentState?: Partial<RangeSliderEmbeddableInput>;
}) => {
  const rangeSliderFactoryStub = new RangeSliderEmbeddableFactory();
  const rangeSliderControlFactory = rangeSliderFactoryStub as unknown as ControlFactory;
  rangeSliderControlFactory.getDefaultInput = () => ({});

  // initial component state can be provided by overriding the defaults.
  const initialComponentState = {
    ...mockRangeSliderComponentState,
    ...partialState?.componentState,
  };
  jest
    .spyOn(rangeSliderStateModule, 'getDefaultComponentState')
    .mockImplementation(() => initialComponentState);

  const mockEmbeddable = (await rangeSliderControlFactory.create({
    ...mockRangeSliderEmbeddableInput,
    ...partialState?.explicitInput,
  })) as RangeSliderEmbeddable;
  mockEmbeddable.getOutput = jest.fn().mockReturnValue(mockRangeSliderOutput);
  return mockEmbeddable;
};
