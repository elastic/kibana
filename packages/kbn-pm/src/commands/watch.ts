/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { runIBazel } from '../utils/bazel';
import { ICommand } from '.';

export const WatchCommand: ICommand = {
  description: 'Runs a build in the Bazel built packages and keeps watching them for changes',
  name: 'watch',

  reportTiming: {
    group: 'scripts/kbn watch',
    id: 'total',
  },

  async run(projects, projectGraph, { options }) {
    const runOffline = options?.offline === true;

    // Call bazel with the target to build all available packages and run it through iBazel to watch it for changes
    //
    // Note: --run_output=false arg will disable the iBazel notifications about gazelle and buildozer when running it
    // Can also be solved by adding a root `.bazel_fix_commands.json` but its not needed at the moment
    await runIBazel(
      ['--run_output=false', 'build', '//packages:build', '--show_result=1'],
      runOffline
    );
  },
};
