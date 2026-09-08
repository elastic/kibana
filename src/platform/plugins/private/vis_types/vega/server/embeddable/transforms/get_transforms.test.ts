/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { VEGA_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { getTransforms } from './get_transforms';

describe('Vega embeddable transforms', () => {
  const drilldownReference = { name: 'drilldown:0', type: 'action', id: 'drilldown-id' };
  const drilldownTransforms: DrilldownTransforms = {
    transformIn: jest.fn((state) => ({
      state: { ...state, drilldowns: state.drilldowns ?? [] },
      references: [drilldownReference],
    })) as DrilldownTransforms['transformIn'],
    transformOut: jest.fn((state) => state) as DrilldownTransforms['transformOut'],
  };

  beforeEach(() => jest.clearAllMocks());

  test('round trips library and drilldown references while preserving panel state', () => {
    const transforms = getTransforms(drilldownTransforms);
    const input = {
      ref_id: 'vega-id',
      title: 'Override',
      time_range: { from: 'now-1h', to: 'now' },
      drilldowns: [
        {
          id: 'drilldown',
          label: 'Drilldown',
          trigger: 'FILTER_TRIGGER',
          type: 'dashboard_drilldown',
        },
      ],
    };
    const transformed = transforms.transformIn(input);

    expect(transformed.state).toEqual({
      title: 'Override',
      time_range: input.time_range,
      drilldowns: input.drilldowns,
    });
    expect(transformed.references).toEqual([
      { name: 'savedObjectRef', type: VEGA_SAVED_OBJECT_TYPE, id: 'vega-id' },
      drilldownReference,
    ]);
    const roundTripped = transforms.transformOut(transformed.state, transformed.references);

    expect(drilldownTransforms.transformOut).toHaveBeenCalledWith(
      transformed.state,
      transformed.references
    );
    expect(roundTripped).toMatchObject({
      ref_id: 'vega-id',
      title: 'Override',
      time_range: input.time_range,
      drilldowns: input.drilldowns,
    });
  });
});
