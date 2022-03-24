/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take, skipWhile, first } from 'rxjs/operators';
import { TimeSliderControlEmbeddableInput } from '.';
import { TimeSliderControlEmbeddable } from './time_slider_embeddable';
import { stubLogstashDataView } from '../../../../data_views/common/data_view.stub';
import { pluginServices } from '../../services';

describe('Time Slider Control Embeddable', () => {
  const services = pluginServices.getServices();
  const fetchRange = jest.spyOn(services.data, 'fetchFieldRange');
  const getDataView = jest.spyOn(services.data, 'getDataView');

  beforeEach(() => {
    jest.resetAllMocks();

    fetchRange.mockResolvedValue({ min: 0, max: 1 });
    getDataView.mockResolvedValue(stubLogstashDataView);
  });

  describe('fetching range', () => {
    it('fetches range on init', async () => {
      const input: TimeSliderControlEmbeddableInput = {
        id: 'id',
        fieldName: 'bytes',
        dataViewId: stubLogstashDataView.id!,
        value: [0, 1],
      };

      const expectedMin = 560;
      const expectedMax = 1020;
      fetchRange.mockResolvedValueOnce({ min: expectedMin, max: expectedMax });

      const embeddable = new TimeSliderControlEmbeddable(input, {});

      const state = await embeddable
        .getComponentState$()
        .pipe(
          skipWhile((value) => value.loading),
          first()
        )
        .toPromise();

      expect(state.min).toBe(expectedMin);
      expect(state.max).toBe(expectedMax);
    });

    it('fetches range on input change', async () => {
      const input: TimeSliderControlEmbeddableInput = {
        id: 'id',
        fieldName: 'bytes',
        dataViewId: stubLogstashDataView.id!,
      };

      const updatedInput: TimeSliderControlEmbeddableInput = {
        id: 'id',
        fieldName: '@timestamp',
        dataViewId: stubLogstashDataView.id!,
      };

      const embeddable = new TimeSliderControlEmbeddable(input, {});
      embeddable.updateInput(updatedInput);

      await embeddable
        .getComponentState$()
        .pipe(
          skipWhile((value) => value.loading),
          first()
        )
        .toPromise();

      expect(fetchRange).toBeCalledWith(stubLogstashDataView, '@timestamp', expect.anything());
    });
  });

  describe('output', () => {
    describe('filter', () => {
      it('outputs the filter from the given value', async () => {
        const input: TimeSliderControlEmbeddableInput = {
          id: 'id',
          fieldName: 'bytes',
          dataViewId: stubLogstashDataView.id!,
          value: [0, 1],
        };

        const embeddable = new TimeSliderControlEmbeddable(input, {});
        const output = await embeddable
          .getOutput$()
          .pipe(
            skipWhile((v) => v.filters === undefined),
            first()
          )
          .toPromise();

        expect(output.filters).toMatchInlineSnapshot(`
          Array [
            Object {
              "meta": Object {
                "field": "bytes",
                "index": "logstash-*",
                "key": "bytes",
                "params": Object {},
              },
              "query": Object {
                "range": Object {
                  "bytes": Object {
                    "gte": 0,
                    "lte": 1,
                  },
                },
              },
            },
          ]
        `);
      });

      it('outputs the filter from a partial value with available range', async () => {
        const input: TimeSliderControlEmbeddableInput = {
          id: 'id',
          fieldName: 'bytes',
          dataViewId: stubLogstashDataView.id!,
          value: [1, undefined],
        };
        const range = { min: 0, max: 10 };
        fetchRange.mockResolvedValue(range);

        const embeddable = new TimeSliderControlEmbeddable(input, {});
        let output = await embeddable
          .getOutput$()
          .pipe(
            skipWhile((v) => v.filters === undefined),
            take(2) // initial value, and then the value after the range is fetched which is what we're interested in
          )
          .toPromise();

        // Missing upper value uses upper range on the query
        expect(output.filters![0].query!.range.bytes.gte).toBe(1);
        expect(output.filters![0].query!.range.bytes.lte).toBe(range.max);

        embeddable.updateInput({
          ...input,
          value: [undefined, 9],
        });

        output = await embeddable.getOutput$().pipe(take(2)).toPromise();

        expect(output.filters![0].query!.range.bytes.gte).toBe(range.min);
        expect(output.filters![0].query!.range.bytes.lte).toBe(9);
      });

      it('excludes filters if no value or range', async () => {
        const input: TimeSliderControlEmbeddableInput = {
          id: 'id',
          fieldName: 'bytes',
          dataViewId: stubLogstashDataView.id!,
          value: [1, undefined],
        };
        const range = { min: undefined, max: undefined };
        fetchRange.mockResolvedValue(range);

        const embeddable = new TimeSliderControlEmbeddable(input, {});
        let output = await embeddable
          .getOutput$()
          .pipe(
            skipWhile((v) => v.filters === undefined),
            take(1) // initial value, and then the value after the range is fetched which is what we're interested in
          )
          .toPromise();

        expect(output.filters![0].query!.range.bytes.gte).toBe(1);
        expect(output.filters![0].query!.range.bytes.lte).toBe(undefined);

        embeddable.updateInput({
          ...input,
          value: [undefined, 9],
        });

        output = await embeddable.getOutput$().pipe(take(2)).toPromise();

        expect(output.filters![0].query!.range.bytes.gte).toBe(undefined);
        expect(output.filters![0].query!.range.bytes.lte).toBe(9);
      });
    });
  });
});
