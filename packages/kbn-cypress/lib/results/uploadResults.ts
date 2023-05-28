import Debug from "debug";
import {
  reportInstanceResultsMerged,
  setInstanceTests,
  SetInstanceTestsPayload,
  updateInstanceResults,
  UpdateInstanceResultsPayload,
} from "../api";
import { uploadArtifacts, uploadStdoutSafe } from "../artifacts";
import { getInitialOutput } from "../capture";
import { isCurrents } from "../env";
import { warn } from "../log";
import { setCancellationReason } from "../state";
import { getInstanceResultPayload, getInstanceTestsPayload } from "./results";
const debug = Debug("currents:results");

export async function getUploadResultsTask({
  instanceId,
  spec,
  runResult,
  output,
}: {
  instanceId: string;
  spec: string;
  runResult: CypressCommandLine.CypressRunResult;
  output: string;
}) {
  const run = runResult.runs.find((r) => r.spec.relative === spec);
  if (!run) {
    warn('Cannot determine run result for spec "%s"', spec);
    return;
  }
  return processCypressResults(
    instanceId,
    {
      // replace the runs with the run for the specified spec
      ...runResult,
      runs: [run],
    },
    output
  );
}

export async function processCypressResults(
  instanceId: string,
  results: CypressCommandLine.CypressRunResult,
  stdout: string
) {
  const run = results.runs[0];
  if (!run) {
    throw new Error("No run found in Cypress results");
  }
  const instanceResults = getInstanceResultPayload(run);
  const instanceTests = getInstanceTestsPayload(run, results.config);

  const { videoUploadUrl, screenshotUploadUrls, cloud } = await reportResults(
    instanceId,
    instanceTests,
    instanceResults
  );

  if (cloud?.shouldCancel) {
    debug("instance %s should cancel", instanceId);
    setCancellationReason(cloud.shouldCancel);
  }
  debug("instance %s artifact upload instructions %o", instanceId, {
    videoUploadUrl,
    screenshotUploadUrls,
  });

  return Promise.all([
    uploadArtifacts({
      videoUploadUrl,
      videoPath: run.video,
      screenshotUploadUrls,
      screenshots: instanceResults.screenshots,
    }),
    uploadStdoutSafe(instanceId, getInitialOutput() + stdout),
  ]);
}

async function reportResults(
  instanceId: string,
  instanceTests: SetInstanceTestsPayload,
  instanceResults: UpdateInstanceResultsPayload
) {
  debug("reporting instance %s results...", instanceId);
  if (isCurrents()) {
    return reportInstanceResultsMerged(instanceId, {
      tests: instanceTests,
      results: instanceResults,
    });
  }

  // run one after another
  await setInstanceTests(instanceId, instanceTests);
  return updateInstanceResults(instanceId, instanceResults);
}
