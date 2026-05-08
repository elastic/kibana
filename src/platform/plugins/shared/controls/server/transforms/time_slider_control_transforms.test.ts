/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { registerTimeSliderControlTransforms } from './time_slider_control_transforms';

const getTransformOut = () => {
  const embeddable = createEmbeddableSetupMock();
  registerTimeSliderControlTransforms(embeddable);

  const [, transformsSetup] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
  const { transformOut } = transformsSetup.getTransforms!({} as DrilldownTransforms);
  return transformOut!;
};

describe('time slider control transforms', () => {
  describe('transformOut', () => {
    const transformOut = getTransformOut();

    it('camel case legacy state', () => {
      const result = transformOut({
        timesliceEndAsPercentageOfTimeRange: 0.75,
        timesliceStartAsPercentageOfTimeRange: 0.25,
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "end_percentage_of_time_range": 0.75,
          "start_percentage_of_time_range": 0.25,
        }
      `);
    });

    it('rounds out of range time slice percentages', () => {
      const result = transformOut({
        end_percentage_of_time_range: 1.005,
        start_percentage_of_time_range: -0.005,
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "end_percentage_of_time_range": 1,
          "start_percentage_of_time_range": 0,
        }
      `);
    });
  });
});
