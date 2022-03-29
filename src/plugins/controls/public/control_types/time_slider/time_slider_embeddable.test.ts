/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { TimeSliderControlEmbeddableInput } from '.';
import { TimeSliderControlEmbeddable } from './time_slider_embeddable';
import { stubLogstashDataView } from '../../../../data_views/common/data_view.stub';
import { pluginServices } from '../../services';
import { TestScheduler } from 'rxjs/testing';
import { buildRangeFilter } from '@kbn/es-query';

const buildFilter = (range: [number | undefined, number | undefined]) => {
  const filterPieces: Record<string, number> = {};
  if (range[0]) {
    filterPieces.gte = range[0];
  }
  if (range[1]) {
    filterPieces.lte = range[1];
  }

  const filter = buildRangeFilter(
    stubLogstashDataView.getFieldByName('bytes')!,
    filterPieces,
    stubLogstashDataView
  );
  filter.meta.key = 'bytes';

  return filter;
};

const rangeMin = 20;
const rangeMax = 30;
const range = { min: rangeMin, max: rangeMax };

const lowerValue: [number, number] = [15, 25];
const upperValue: [number, number] = [25, 35];
const withinRangeValue: [number, number] = [21, 29];
const outOfRangeValue: [number, number] = [31, 40];

const rangeFilter = buildFilter([rangeMin, rangeMax]);
const lowerValueFilter = buildFilter(lowerValue);
const lowerValuePartialFilter = buildFilter([20, 25]);
const upperValueFilter = buildFilter(upperValue);
const upperValuePartialFilter = buildFilter([25, 30]);
const withinRangeValueFilter = buildFilter(withinRangeValue);
const outOfRangeValueFilter = buildFilter(outOfRangeValue);

const baseInput: TimeSliderControlEmbeddableInput = {
  id: 'id',
  fieldName: 'bytes',
  dataViewId: stubLogstashDataView.id!,
};

describe('Time Slider Control Embeddable', () => {
  const services = pluginServices.getServices();
  const fetchRange = jest.spyOn(services.data, 'fetchFieldRange');
  const getDataView = jest.spyOn(services.data, 'getDataView');
  const fetchRange$ = jest.spyOn(services.data, 'fetchFieldRange$');
  const getDataView$ = jest.spyOn(services.data, 'getDataView$');

  beforeEach(() => {
    jest.resetAllMocks();

    fetchRange.mockResolvedValue(range);
    fetchRange$.mockReturnValue(of(range).pipe(delay(100)));
    getDataView.mockResolvedValue(stubLogstashDataView);
    getDataView$.mockReturnValue(of(stubLogstashDataView));
  });

  describe('outputting filters', () => {
    let testScheduler: TestScheduler;
    beforeEach(() => {
      testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });
    });

    const testFilterOutput = (
      input: any,
      expectedFilterAfterRangeFetch: any,
      mockRange: { min?: number; max?: number } = range
    ) => {
      testScheduler.run(({ expectObservable, cold }) => {
        fetchRange$.mockReturnValue(cold('--b', { b: mockRange }));
        const expectedMarbles = 'a-b';
        const expectedValues = {
          a: undefined,
          b: expectedFilterAfterRangeFetch ? [expectedFilterAfterRangeFetch] : undefined,
        };

        const embeddable = new TimeSliderControlEmbeddable(input, {});
        const source$ = embeddable.getOutput$().pipe(map((o) => o.filters));

        expectObservable(source$).toBe(expectedMarbles, expectedValues);
      });
    };

    it('outputs filter of the range when no value is given', () => {
      testFilterOutput(baseInput, rangeFilter);
    });

    it('outputs the value filter after the range is fetched', () => {
      testFilterOutput({ ...baseInput, value: withinRangeValue }, withinRangeValueFilter);
    });

    describe('with validation', () => {
      it('outputs a partial value filter if value is below range', () => {
        testFilterOutput({ ...baseInput, value: lowerValue }, lowerValuePartialFilter);
      });

      it('outputs a partial value filter if value is above range', () => {
        testFilterOutput({ ...baseInput, value: upperValue }, upperValuePartialFilter);
      });

      it('outputs range filter value if value is completely out of range', () => {
        testFilterOutput({ ...baseInput, value: outOfRangeValue }, rangeFilter);
      });

      it('outputs no filter when no range available', () => {
        testFilterOutput({ ...baseInput, value: withinRangeValue }, undefined, {});
      });
    });

    describe('with validation off', () => {
      it('outputs the lower value filter', () => {
        testFilterOutput(
          { ...baseInput, ignoreParentSettings: { ignoreValidations: true }, value: lowerValue },
          lowerValueFilter
        );
      });

      it('outputs the uppwer value filter', () => {
        testFilterOutput(
          { ...baseInput, ignoreParentSettings: { ignoreValidations: true }, value: upperValue },
          upperValueFilter
        );
      });

      it('outputs the out of range filter', () => {
        testFilterOutput(
          {
            ...baseInput,
            ignoreParentSettings: { ignoreValidations: true },
            value: outOfRangeValue,
          },
          outOfRangeValueFilter
        );
      });

      it('outputs the value filter when no range found', () => {
        testFilterOutput(
          {
            ...baseInput,
            ignoreParentSettings: { ignoreValidations: true },
            value: withinRangeValue,
          },
          withinRangeValueFilter,
          { min: undefined, max: undefined }
        );
      });
    });
  });

  describe('fetching range', () => {
    it('fetches range on init', () => {
      const testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });

      testScheduler.run(({ cold, expectObservable }) => {
        const mockRange = { min: 1, max: 2 };
        fetchRange$.mockReturnValue(cold('--b', { b: mockRange }));

        const expectedMarbles = 'a-b';
        const expectedValues = {
          a: undefined,
          b: mockRange,
        };

        const embeddable = new TimeSliderControlEmbeddable(baseInput, {});
        const source$ = embeddable.getComponentState$().pipe(map((state) => state.range));

        const { fieldName, ...inputForFetch } = baseInput;

        expectObservable(source$).toBe(expectedMarbles, expectedValues);
        expect(fetchRange$).toBeCalledWith(stubLogstashDataView, fieldName, {
          ...inputForFetch,
          filters: undefined,
          query: undefined,
          timeRange: undefined,
          viewMode: 'edit',
        });
      });
    });

    it('fetches range on input change', () => {
      const testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });

      testScheduler.run(({ cold, expectObservable, flush }) => {
        const mockRange = { min: 1, max: 2 };
        fetchRange$.mockReturnValue(cold('a', { a: mockRange }));

        const embeddable = new TimeSliderControlEmbeddable(baseInput, {});
        const updatedInput = { ...baseInput, fieldName: '@timestamp' };

        embeddable.updateInput(updatedInput);

        expect(fetchRange$).toBeCalledTimes(2);
        expect(fetchRange$.mock.calls[1][1]).toBe(updatedInput.fieldName);
      });
    });

    it('passes input to fetch range to build the query', () => {
      const testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });

      testScheduler.run(({ cold, expectObservable, flush }) => {
        const mockRange = { min: 1, max: 2 };
        fetchRange$.mockReturnValue(cold('a', { a: mockRange }));

        const input = {
          ...baseInput,
          query: {} as any,
          filters: {} as any,
          timeRange: {} as any,
        };

        new TimeSliderControlEmbeddable(input, {});

        expect(fetchRange$).toBeCalledTimes(1);
        const args = fetchRange$.mock.calls[0][2];
        expect(args.query).toBe(input.query);
        expect(args.filters).toBe(input.filters);
        expect(args.timeRange).toBe(input.timeRange);
      });
    });

    it('does not pass ignored parent settings', () => {
      const testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });

      testScheduler.run(({ cold, expectObservable, flush }) => {
        const mockRange = { min: 1, max: 2 };
        fetchRange$.mockReturnValue(cold('a', { a: mockRange }));

        const input = {
          ...baseInput,
          query: '' as any,
          filters: {} as any,
          timeRange: {} as any,
          ignoreParentSettings: { ignoreFilters: true, ignoreQuery: true, ignoreTimerange: true },
        };

        new TimeSliderControlEmbeddable(input, {});

        expect(fetchRange$).toBeCalledTimes(1);
        const args = fetchRange$.mock.calls[0][2];
        expect(args.query).not.toBe(input.query);
        expect(args.filters).not.toBe(input.filters);
        expect(args.timeRange).not.toBe(input.timeRange);
      });
    });
  });
});
