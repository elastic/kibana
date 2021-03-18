/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../../../embeddable/public';
import { createAction } from '../../../ui_actions/public';
import { TIME_RANGE_DATA_MODES } from '../../common/timerange_data_modes';
import { PANEL_TYPES } from '../../common/panel_types';
import { Vis } from '../../../visualizations/public';

const LAST_VALUE_MODE = 'lastValueMode';

interface TimeseriesEmbeddableOutput extends EmbeddableOutput {
  visTypeName?: string;
}

interface TimeseriesEmbeddable extends IEmbeddable<EmbeddableInput, TimeseriesEmbeddableOutput> {
  vis: Vis;
}

interface LastValueModeActionContext {
  embeddable: TimeseriesEmbeddable;
}

export const lastValueModeAction = createAction<LastValueModeActionContext>({
  id: LAST_VALUE_MODE,
  getDisplayName: () =>
    i18n.translate('visTypeTimeseries.lastValueModeAction.lastValueModeName', {
      defaultMessage: 'Last value',
    }),
  isCompatible: async ({ embeddable }: LastValueModeActionContext) => {
    if (
      embeddable.getOutput().visTypeName === 'metrics' &&
      embeddable.vis.params.type !== PANEL_TYPES.TIMESERIES
    ) {
      const timeRangeMode = embeddable.vis.params.time_range_mode;
      return !timeRangeMode || timeRangeMode === TIME_RANGE_DATA_MODES.LAST_VALUE;
    }
    return false;
  },
  execute: async () => {},
});
