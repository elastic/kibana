/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { parse } from 'hjson';
import type { Vis } from '@kbn/visualizations-plugin/public';
import { ExperimentalMapLayerInfo, shouldShowMapLayerInfo } from './experimental_map_vis_info';
import {
  DeprecatedHistogramIntervalInfo,
  shouldShowDeprecatedHistogramIntervalInfo,
} from './deprecated_interval_info';

import type { VegaSpec } from '../data_model/types';

const parseSpec = (spec: string) => {
  if (spec) {
    try {
      return parse(spec, { legacyRoot: false, keepWsc: true });
    } catch (e) {
      // spec is invalid
    }
  }
};

const InfoMessage = ({ spec }: { spec: string }) => {
  const vegaSpec: VegaSpec = useMemo(() => parseSpec(spec), [spec]);

  if (!vegaSpec) {
    return null;
  }

  return (
    <>
      {shouldShowMapLayerInfo(vegaSpec) && <ExperimentalMapLayerInfo />}
      {shouldShowDeprecatedHistogramIntervalInfo(vegaSpec) && <DeprecatedHistogramIntervalInfo />}
    </>
  );
};

export const getInfoMessage = (vis: Vis) => <InfoMessage spec={vis.params.spec} />;
