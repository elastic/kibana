/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { StartServicesAccessor } from '@kbn/core/server';
import { SavedObjectsClient, SavedObjectsCreatePointInTimeFinderOptions } from '@kbn/core/server';
import {
  DATA_VIEW_SAVED_OBJECT_TYPE,
  DataViewAttributes,
  FieldSpec,
  RuntimeField,
} from '../common';
import { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from './types';

interface CountSummary {
  min?: number;
  max?: number;
  avg?: number;
}

type DataViewFieldAttrs = Pick<DataViewAttributes, 'fields' | 'runtimeFieldMap'>;

interface IndexPatternUsage {
  indexPatternsCount: number;
  indexPatternsWithScriptedFieldCount: number;
  indexPatternsWithRuntimeFieldCount: number;
  scriptedFieldCount: number;
  runtimeFieldCount: number;
  perIndexPattern: {
    scriptedFieldCount: CountSummary;
    runtimeFieldCount: CountSummary;
    scriptedFieldLineCount: CountSummary;
    runtimeFieldLineCount: CountSummary;
  };
}

export const minMaxAvgLoC = (scripts: Array<string | undefined>) => {
  const lengths = scripts.map((script) => script?.split(/\r\n|\r|\n/).length || 0).sort();
  return {
    min: lengths[0],
    max: lengths[lengths.length - 1],
    avg: lengths.reduce((col, count) => col + count, 0) / lengths.length,
  };
};

export const updateMin = (currentMin: number | undefined, newVal: number): number => {
  if (currentMin === undefined || currentMin > newVal) {
    return newVal;
  } else {
    return currentMin;
  }
};

export const updateMax = (currentMax: number | undefined, newVal: number): number => {
  if (currentMax === undefined || currentMax < newVal) {
    return newVal;
  } else {
    return currentMax;
  }
};

export async function getIndexPatternTelemetry(savedObjectsService: SavedObjectsClient) {
  const countSummaryDefaults: CountSummary = {
    min: undefined,
    max: undefined,
    avg: undefined,
  };

  const results = {
    indexPatternsCount: 0,
    indexPatternsWithScriptedFieldCount: 0,
    indexPatternsWithRuntimeFieldCount: 0,
    scriptedFieldCount: 0,
    runtimeFieldCount: 0,
    perIndexPattern: {
      scriptedFieldCount: { ...countSummaryDefaults },
      runtimeFieldCount: { ...countSummaryDefaults },
      scriptedFieldLineCount: { ...countSummaryDefaults },
      runtimeFieldLineCount: { ...countSummaryDefaults },
    },
  };

  const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
    type: DATA_VIEW_SAVED_OBJECT_TYPE,
    perPage: 1000,
    fields: ['fields', 'runtimeFieldMap'],
  };

  const finder = savedObjectsService.createPointInTimeFinder<DataViewFieldAttrs>(findOptions);

  for await (const response of finder.find()) {
    const { saved_objects: savedObjects, total } = response;
    results.indexPatternsCount = total;

    savedObjects.forEach((obj) => {
      const fields = obj.attributes?.fields ? JSON.parse(obj.attributes.fields) || [] : [];
      const runtimeFieldsMap = obj.attributes?.runtimeFieldMap
        ? JSON.parse(obj.attributes.runtimeFieldMap) || {}
        : {};
      const scriptedFields: FieldSpec[] = fields.filter((fld: FieldSpec) => !!fld.script);
      const runtimeFields: RuntimeField[] = Object.values(runtimeFieldsMap);

      // calc LoC
      if (scriptedFields.length > 0) {
        // increment counts
        results.indexPatternsWithScriptedFieldCount++;
        results.scriptedFieldCount += scriptedFields.length;

        // calc LoC
        results.perIndexPattern.scriptedFieldLineCount = minMaxAvgLoC(
          scriptedFields.map((fld) => fld.script || '')
        );

        // calc field counts
        results.perIndexPattern.scriptedFieldCount.min = updateMin(
          results.perIndexPattern.scriptedFieldCount.min,
          scriptedFields.length
        );
        results.perIndexPattern.scriptedFieldCount.max = updateMax(
          results.perIndexPattern.scriptedFieldCount.max,
          scriptedFields.length
        );
        results.perIndexPattern.scriptedFieldCount.avg =
          results.scriptedFieldCount / results.indexPatternsWithScriptedFieldCount;
      }

      if (runtimeFields.length > 0) {
        // increment counts
        results.indexPatternsWithRuntimeFieldCount++;
        results.runtimeFieldCount += runtimeFields.length;

        // calc LoC
        const runtimeFieldScripts = runtimeFields.map((fld) => fld.script?.source || '');
        results.perIndexPattern.runtimeFieldLineCount = minMaxAvgLoC(runtimeFieldScripts);

        // calc field counts
        results.perIndexPattern.runtimeFieldCount.min = updateMin(
          results.perIndexPattern.runtimeFieldCount.min,
          runtimeFields.length
        );
        results.perIndexPattern.runtimeFieldCount.max = updateMax(
          results.perIndexPattern.runtimeFieldCount.max,
          runtimeFields.length
        );
        results.perIndexPattern.runtimeFieldCount.avg =
          results.runtimeFieldCount / results.indexPatternsWithRuntimeFieldCount;
      }
    });
  }

  return results;
}

export function registerIndexPatternsUsageCollector(
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  usageCollection?: UsageCollectionSetup
): void {
  if (!usageCollection) {
    return;
  }

  const indexPatternUsageCollector = usageCollection.makeUsageCollector<IndexPatternUsage>({
    type: 'index-patterns',
    isReady: () => true,
    fetch: async () => {
      const [{ savedObjects }] = await getStartServices();

      const savedObjectsService = new SavedObjectsClient(savedObjects.createInternalRepository());
      return await getIndexPatternTelemetry(savedObjectsService);
    },
    schema: {
      indexPatternsCount: { type: 'long' },
      indexPatternsWithScriptedFieldCount: { type: 'long' },
      indexPatternsWithRuntimeFieldCount: { type: 'long' },
      scriptedFieldCount: { type: 'long' },
      runtimeFieldCount: { type: 'long' },
      perIndexPattern: {
        scriptedFieldCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
        runtimeFieldCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
        scriptedFieldLineCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
        runtimeFieldLineCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
      },
    },
  });

  usageCollection.registerCollector(indexPatternUsageCollector);
}
