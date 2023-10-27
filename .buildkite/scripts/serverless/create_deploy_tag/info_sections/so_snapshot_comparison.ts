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

export function compareSOSnapshots(previousSha: string, selectedSha: string) {
  const command = `node scripts/snapshot_plugin_types compare --from ${previousSha} --to ${selectedSha}`;
  const outputPath = path.resolve(getKibanaDir(), 'so_comparison.json');
  exec(`${command} --outputPath ${outputPath}`, { stdio: 'inherit' });

  const soComparisonResult = JSON.parse(readFileSync(outputPath).toString());

  const buildkite = new BuildkiteClient({ exec });
  buildkite.uploadArtifacts(outputPath);

  return {
    hasChanges: soComparisonResult.hasChanges,
    changed: soComparisonResult.changed,
    command,
  };
}

export function toSOComparisonBlockHtml(comparisonResult: {
  hasChanges: any;
  changed: any;
  command: string;
}): string {
  return `<div>
<h4>Plugin Saved Object migration changes: ${comparisonResult.hasChanges}</h4>
<div>Changed plugins: ${comparisonResult.changed.join(', ')}</div>
<i>Find detailed info in the archived artifacts, or run the command yourself: </i>
<div><pre>${comparisonResult.command}</pre></div>
</div>`;
}
