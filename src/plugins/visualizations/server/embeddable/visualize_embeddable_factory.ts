/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow } from 'lodash';
import { EmbeddableRegistryDefinition } from 'src/plugins/embeddable/server';
import type { SerializableRecord } from '@kbn/utility-types';
import {
  commonAddSupportOfDualIndexSelectionModeInTSVB,
  commonHideTSVBLastValueIndicator,
  commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel,
  commonMigrateVislibPie,
  commonAddEmptyValueColorRule,
  commonMigrateTagCloud,
  commonAddDropLastBucketIntoTSVBModel,
  commonRemoveMarkdownLessFromTSVB,
} from '../migrations/visualization_common_migrations';

const byValueAddSupportOfDualIndexSelectionModeInTSVB = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonAddSupportOfDualIndexSelectionModeInTSVB(state.savedVis),
  };
};

const byValueHideTSVBLastValueIndicator = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonHideTSVBLastValueIndicator(state.savedVis),
  };
};

const byValueAddDropLastBucketIntoTSVBModel = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonAddDropLastBucketIntoTSVBModel(state.savedVis),
  };
};

const byValueRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel(state.savedVis),
  };
};

const byValueAddEmptyValueColorRule = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonAddEmptyValueColorRule(state.savedVis),
  };
};

const byValueMigrateVislibPie = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonMigrateVislibPie(state.savedVis),
  };
};

const byValueMigrateTagcloud = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonMigrateTagCloud(state.savedVis),
  };
};

const byValueRemoveMarkdownLessFromTSVB = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonRemoveMarkdownLessFromTSVB(state.savedVis),
  };
};

export const visualizeEmbeddableFactory = (): EmbeddableRegistryDefinition => {
  return {
    id: 'visualization',
    migrations: {
      // These migrations are run in 7.13.1 for `by value` panels because the 7.13 release window was missed.
      '7.13.1': (state) =>
        flow(
          byValueAddSupportOfDualIndexSelectionModeInTSVB,
          byValueHideTSVBLastValueIndicator,
          byValueRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel
        )(state),
      '7.14.0': (state) =>
        flow(
          byValueAddEmptyValueColorRule,
          byValueMigrateVislibPie,
          byValueMigrateTagcloud,
          byValueAddDropLastBucketIntoTSVBModel
        )(state),
      '8.0.0': (state) => flow(byValueRemoveMarkdownLessFromTSVB)(state),
    },
  };
};
