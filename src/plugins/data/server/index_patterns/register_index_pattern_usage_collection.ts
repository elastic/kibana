/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { StartServicesAccessor } from 'src/core/server';
import { IndexPatternsCommonService } from '..';
import { SavedObjectsClient } from '../../../../core/server';
import { DataPluginStartDependencies, DataPluginStart } from '../plugin';

interface CountSummary {
  min: number;
  max: number;
  avg: number;
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

const minMaxAvgLoC = (scripts: string[]) => {
  const lengths = scripts.map((script) => script?.split(/\r\n|\r|\n/).length || 0).sort();
  return {
    min: lengths[0],
    max: lengths[lengths.length - 1],
    avg: lengths.reduce((col, count) => col + count, 0) / lengths.length,
  };
};

const updateMin = (currentMin: number, newVal: number) => {
  if (currentMin === 0 || currentMin > newVal) {
    currentMin = newVal;
  }
};

const updateMax = (currentMax: number, newVal: number) => {
  if (currentMax === 0 || currentMax < newVal) {
    currentMax = newVal;
  }
};

export async function getIndexPatternTelemetry(indexPatterns: IndexPatternsCommonService) {
  const ids = await indexPatterns.getIds();

  const countSummaryDefaults = {
    min: 0,
    max: 0,
    avg: 0,
  };

  const results = {
    indexPatternsCount: ids.length,
    indexPatternsWithScriptedFieldCount: 0,
    indexPatternsWithRuntimeFieldCount: 0,
    scriptedFieldCount: 0,
    runtimeFieldCount: 0,
    perIndexPattern: {
      scriptedFieldCount: countSummaryDefaults,
      runtimeFieldCount: countSummaryDefaults,
      scriptedFieldLineCount: countSummaryDefaults,
      runtimeFieldLineCount: countSummaryDefaults,
    },
  };

  ids.forEach(async (id) => {
    const ip = await indexPatterns.get(id);
    // SCRIPTED FIELDS
    const scriptedFields = ip.getScriptedFields();
    const ipScriptedFieldLineCount = minMaxAvgLoC(scriptedFields.map((fld) => fld.script || ''));
    results.perIndexPattern.scriptedFieldLineCount = ipScriptedFieldLineCount;

    // RUNTIME FIELDS
    const runtimeFields = ip.fields.filter((fld) => !!fld.runtimeField);
    const runtimeFieldScripts = runtimeFields.map((fld) => fld.runtimeField?.script?.source || '');
    const ipRuntimeFieldLineCount = minMaxAvgLoC(runtimeFieldScripts);
    results.perIndexPattern.runtimeFieldLineCount = ipRuntimeFieldLineCount;

    // index pattern count
    if (scriptedFields.length > 0) {
      results.indexPatternsWithScriptedFieldCount++;
    }
    if (runtimeFields.length > 0) {
      results.indexPatternsWithRuntimeFieldCount++;
    }
    //

    // field count
    results.scriptedFieldCount += scriptedFields.length;
    results.runtimeFieldCount += runtimeFields.length;
    //

    updateMin(results.perIndexPattern.scriptedFieldCount.min, scriptedFields.length);
    updateMax(results.perIndexPattern.scriptedFieldCount.max, scriptedFields.length);

    updateMin(results.perIndexPattern.runtimeFieldCount.min, runtimeFields.length);
    updateMax(results.perIndexPattern.runtimeFieldCount.max, runtimeFields.length);
  });

  results.perIndexPattern.scriptedFieldCount.avg =
    results.scriptedFieldCount / results.indexPatternsWithScriptedFieldCount;
  results.perIndexPattern.runtimeFieldCount.avg =
    results.runtimeFieldCount / results.indexPatternsWithRuntimeFieldCount;

  return results;
}

export function registerIndexPatternsUsageCollector(
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>,
  usageCollection?: UsageCollectionSetup
): void {
  if (!usageCollection) {
    return;
  }

  const indexPatternUsageCollector = usageCollection.makeUsageCollector<IndexPatternUsage>({
    type: 'index-patterns',
    isReady: () => true,
    fetch: async () => {
      const [{ savedObjects, elasticsearch }, , { indexPatterns }] = await getStartServices();
      const indexPatternService = await indexPatterns.indexPatternsServiceFactory(
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
