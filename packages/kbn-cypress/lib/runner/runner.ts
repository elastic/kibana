/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
import { SpecWithRelativeRoot, ValidatedCurrentsParameters } from '../../types';
import { getCapturedOutput, resetCapture } from '../capture';
import { MergedConfig } from '../config';

import { getSummaryForSpec, getUploadResultsTask, normalizeRawResult } from '../results';

import {
  createBatchedInstances,
  createInstance,
  CreateInstancePayload,
  InstanceResponseSpecDetails,
} from '../api';

import { runSpecFileSafe } from '../cypress';
import { isCurrents } from '../env';
import { divider, error, info, title, warn } from '../log';
import { summary, uploadTasks } from './state';

const debug = Debug('currents:runner');

export async function runTillDone(
  {
    runId,
    groupId,
    machineId,
    platform,
    config,
    specs: allSpecs,
  }: CreateInstancePayload & {
    config: MergedConfig;
    specs: SpecWithRelativeRoot[];
  },
  params: ValidatedCurrentsParameters
) {
  let hasMore = true;

  while (hasMore) {
    const newTasks = await runBatch({
      runMeta: {
        runId,
        groupId,
        machineId,
        platform,
      },
      allSpecs,
      params,
      config,
    });
    if (!newTasks.length) {
      debug('No more tasks to run. Uploads queue: %d', uploadTasks.length);
      hasMore = false;
      break;
    }
    newTasks.forEach((task) => {
      if (task.summary.specSummary) {
        summary[task.summary.spec] = task.summary.specSummary;
      }
      uploadTasks.push(task.uploadTasks);
    });
  }
}

async function runBatch({
  runMeta,
  config,
  params,
  allSpecs,
}: {
  runMeta: {
    runId: string;
    groupId: string;
    machineId: string;
    platform: CreateInstancePayload['platform'];
  };
  allSpecs: SpecWithRelativeRoot[];
  config: MergedConfig;
  params: ValidatedCurrentsParameters;
}) {
  let batch = {
    specs: [] as InstanceResponseSpecDetails[],
    claimedInstances: 0,
    totalInstances: 0,
  };

  if (isCurrents()) {
    debug('Getting batched tasks: %d', params.batchSize);
    batch = await createBatchedInstances({
      ...runMeta,
      batchSize: params.batchSize,
    });
    debug('Got batched tasks: %o', batch);
  } else {
    const response = await createInstance(runMeta);

    if (response.spec !== null && response.instanceId !== null) {
      batch.specs.push({
        spec: response.spec,
        instanceId: response.instanceId,
      });
    }
    batch.claimedInstances = response.claimedInstances;
    batch.totalInstances = response.totalInstances;
  }

  if (batch.specs.length === 0) {
    return [];
  }

  divider();
  info(
    'Running: %s (%d/%d)',
    batch.specs.map((s) => s.spec).join(', '),
    batch.claimedInstances,
    batch.totalInstances
  );

  const rawResult = await runSpecFileSafe(
    {
      // use absolute paths -  user can run the program from a different directory, e.g. nx or a monorepo workspace
      // cypress still reports the path relative to the project root
      spec: batch.specs.map((bs) => getSpecAbsolutePath(allSpecs, bs.spec)).join(','),
    },
    params
  );
  const normalizedResult = normalizeRawResult(
    rawResult,
    batch.specs.map((s) => s.spec),
    config
  );

  title('blue', 'Reporting results and artifacts in background...');

  const output = getCapturedOutput();
  resetCapture();

  const batchResult = batch.specs.map((spec) => {
    const specSummary = getSummaryForSpec(spec.spec, normalizedResult);
    if (!specSummary) {
      warn('Cannot find run result for spec "%s"', spec.spec);
    }

    return {
      summary: {
        spec: spec.spec,
        specSummary,
      },
      uploadTasks: getUploadResultsTask({
        ...spec,
        runResult: normalizedResult,
        output,
      }).catch(error),
    };
  });

  return batchResult;
}

function getSpecAbsolutePath(allSpecs: SpecWithRelativeRoot[], relative: string) {
  const absolutePath = allSpecs.find((i) => i.relative === relative)?.absolute;
  if (!absolutePath) {
    warn('Cannot find absolute path for spec. Spec: "%s", candidates: %o', relative, allSpecs);
    throw new Error(`Cannot find absolute path for spec`);
  }
  return absolutePath;
}
