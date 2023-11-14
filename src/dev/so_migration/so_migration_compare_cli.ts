/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';

import { compareSnapshots } from './compare_snapshots';

const scriptName = process.argv[1].replace(/^.*scripts\//, 'scripts/');

run(
  async ({ log, flagsReader, procRunner }) => {
    const outputPath = flagsReader.string('outputPath');

    const from = flagsReader.requiredString('from');
    const to = flagsReader.requiredString('to');

    const result = await compareSnapshots({ from, to, outputPath, log });

    return {
      outputPath,
      result,
      log,
    };
  },
  {
    usage: [
      process.argv0,
      scriptName,
      'compare',
      '--from <rev|filename|url>',
      '--to <rev|filename|url>',
      '[--outputPath <outputPath>]',
    ].join(' '),
    description: `Compares two Saved Object snapshot files based on hashes, filenames or urls.`,
    flags: {
      string: ['outputPath', 'from', 'to'],
      help: `
        --from            The source snapshot to compare from. Can be a revision, filename or url.
        --to              The target snapshot to compare to. Can be a revision, filename or url.
        --outputPath      The path to write the comparison report to. If omitted, raw JSON will be output to stdout.
      `,
    },
  }
)
  .then((success) => {
    // Kibana won't stop because some async processes are stuck polling, we need to shut down the process.
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
