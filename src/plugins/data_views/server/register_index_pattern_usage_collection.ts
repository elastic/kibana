/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { StartServicesAccessor } from 'src/core/server';
import { DataViewsContract } from '../common';
import { SavedObjectsClient } from '../../../core/server';
import { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from './types';

interface CountSummary {
  min?: number;
  max?: number;
  avg?: number;
}

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

export async function getIndexPatternTelemetry(indexPatterns: DataViewsContract) {
  const ids = await indexPatterns.getIds();

  const countSummaryDefaults: CountSummary = {
    min: undefined,
    max: undefined,
    avg: undefined,
  };

  const results = {
    indexPatternsCount: ids.length,
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

  await ids.reduce(async (col, id) => {
    await col;
    const ip = await indexPatterns.get(id);

    const scriptedFields = ip.getScriptedFields();
    const runtimeFields = ip.fields.filter((fld) => !!fld.runtimeField);

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
      const runtimeFieldScripts = runtimeFields.map(
        (fld) => fld.runtimeField?.script?.source || ''
      );
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
  }, Promise.resolve());

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
      const [{ savedObjects, elasticsearch }, , { indexPatternsServiceFactory }] =
        await getStartServices();
      const indexPatternService = await indexPatternsServiceFactory(
        new SavedObjectsClient(savedObjects.createInternalRepository()),
        elasticsearch.client.asInternalUser
      );

      return await getIndexPatternTelemetry(indexPatternService);
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
