/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { getChartSectionConfiguration } from './get_chart_section_configuration';
import type { ChartSectionConfiguration } from '../../../../types';
import { DataSourceCategory } from '../../../../profiles';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../../toolkit';

const getConfig = (latencyMapEnabled: boolean) => {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockImplementation((flag, fallback) =>
    of(flag === 'observability.tracesLatencyMapEnabled' ? latencyMapEnabled : fallback)
  );
  const accessor = getChartSectionConfiguration({ core });

  if (!accessor) {
    throw new Error('getChartSectionConfiguration was not created.');
  }

  return accessor(() => ({ replaceDefaultChart: false } as ChartSectionConfiguration), {
    context: { category: DataSourceCategory.Traces },
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  })();
};

describe('getChartSectionConfiguration', () => {
  it('replaces the default chart, with its own storage key and a content-sized default height, with the latency map', () => {
    expect(getConfig(true)).toEqual(
      expect.objectContaining({
        replaceDefaultChart: true,
        // Without its own prefix the section would read the regular histogram's saved
        // height ('discover:histogramHeight'), sized for a different chart.
        localStorageKeyPrefix: 'discover:tracesExperience',
        defaultTopPanelHeight: 'max-content',
      })
    );
  });

  it('keeps the RED charts under their usual key and height while the latency map flag is off', () => {
    const config = getConfig(false);
    expect(config).toEqual(
      expect.objectContaining({ replaceDefaultChart: true, defaultTopPanelHeight: 300 })
    );
    expect(config).not.toHaveProperty('localStorageKeyPrefix');
  });
});
