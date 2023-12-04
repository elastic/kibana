/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { readFileSync } from 'fs';
import { exec } from '../shared';
import { BuildkiteClient, getKibanaDir } from '#pipeline-utils';

export function compareSOSnapshots(
  previousSha: string,
  selectedSha: string
): null | {
  hasChanges: boolean;
  changed: string[];
  command: string;
} {
  assertValidSha(previousSha);
  assertValidSha(selectedSha);

  const command = `node scripts/snapshot_plugin_types compare --from ${previousSha} --to ${selectedSha}`;
  const outputPath = path.resolve(getKibanaDir(), 'so_comparison.json');

  try {
    exec(`${command} --outputPath ${outputPath}`, { stdio: 'inherit' });

    const soComparisonResult = JSON.parse(readFileSync(outputPath).toString());

    const buildkite = new BuildkiteClient({ exec });
    buildkite.uploadArtifacts(outputPath);

    return {
      hasChanges: soComparisonResult.hasChanges,
      changed: soComparisonResult.changed,
      command,
    };
  } catch (ex) {
    console.error(ex);
    return null;
  }
}

export function makeSOComparisonBlockHtml(comparisonResult: {
  hasChanges: boolean;
  changed: string[];
  command: string;
}): string {
  if (comparisonResult.hasChanges) {
    return `<div>
<h4>Plugin Saved Object migration changes: *yes, ${comparisonResult.changed.length} plugin(s)*</h4>
<div>Changed plugins: <strong>${comparisonResult.changed.join(', ')}</strong></div>
<i>Find detailed info in the archived artifacts, or run the command yourself: </i>
<div><pre>${comparisonResult.command}</pre></div>
</div>`;
  } else {
    return `<div>
<h4>Plugin Saved Object migration changes: none</h4>
<i>No changes between targets, you can run the command yourself to verify: </i>
<div><pre>${comparisonResult.command}</pre></div>
</div>`;
  }
}

export function makeSOComparisonErrorHtml(): string {
  return `<div>
<h4>Plugin Saved Object migration changes: N/A</h4>
<div>Could not compare plugin migrations. Check the logs for more info.</div>
</div>`;
}

function assertValidSha(sha: string) {
  if (!sha.match(/^[a-f0-9]{8,40}$/)) {
    throw new Error(`Invalid sha: ${sha}`);
  }
}
