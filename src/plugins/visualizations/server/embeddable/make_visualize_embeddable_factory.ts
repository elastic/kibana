/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow, mapValues } from 'lodash';
import { EmbeddableRegistryDefinition } from 'src/plugins/embeddable/server';
import type { SerializableRecord } from '@kbn/utility-types';
import { SerializedSearchSourceFields } from 'src/plugins/data/public';
import {
  mergeMigrationFunctionMaps,
  MigrateFunctionsObject,
  MigrateFunction,
} from '../../../kibana_utils/common';
import {
  commonAddSupportOfDualIndexSelectionModeInTSVB,
  commonHideTSVBLastValueIndicator,
  commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel,
  commonMigrateVislibPie,
  commonAddEmptyValueColorRule,
  commonMigrateTagCloud,
  commonAddDropLastBucketIntoTSVBModel,
  commonAddDropLastBucketIntoTSVBModel714Above,
  commonRemoveMarkdownLessFromTSVB,
  commonUpdatePieVisApi,
} from '../migrations/visualization_common_migrations';
import { SerializedVis } from '../../common';

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

const byValueAddDropLastBucketIntoTSVBModel714Above = (state: SerializableRecord) => {
  return {
    ...state,
    savedVis: commonAddDropLastBucketIntoTSVBModel714Above(state.savedVis),
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

const byValueUpdatePieVisApi = (state: SerializableRecord) => ({
  ...state,
  savedVis: commonUpdatePieVisApi(state.savedVis),
});

const getEmbeddedVisualizationSearchSourceMigrations = (
  searchSourceMigrations: MigrateFunctionsObject
) =>
  mapValues<MigrateFunctionsObject, MigrateFunction>(
    searchSourceMigrations,
    (migrate: MigrateFunction<SerializedSearchSourceFields>): MigrateFunction =>
      (state) => {
        const _state = state as unknown as { savedVis: SerializedVis };
        return {
          ..._state,
          savedVis: {
            ..._state.savedVis,
            data: {
              ..._state.savedVis.data,
              searchSource: migrate(_state.savedVis.data.searchSource),
            },
          },
        };
      }
  );

export const makeVisualizeEmbeddableFactory =
  (getSearchSourceMigrations: () => MigrateFunctionsObject) => (): EmbeddableRegistryDefinition => {
    return {
      id: 'visualization',
      // migrations set up as a callable so that getSearchSourceMigrations doesn't get invoked till after plugin setup steps
      migrations: () =>
        mergeMigrationFunctionMaps(
          getEmbeddedVisualizationSearchSourceMigrations(getSearchSourceMigrations()),
          {
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
            '7.17.0': (state) => flow(byValueAddDropLastBucketIntoTSVBModel714Above)(state),
            '8.0.0': (state) => flow(byValueRemoveMarkdownLessFromTSVB)(state),
            '8.1.0': (state) => flow(byValueUpdatePieVisApi)(state),
          }
        ),
    };
  };
