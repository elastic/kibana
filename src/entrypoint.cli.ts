#!/usr/bin/env node
import yargsParser from 'yargs-parser';
import { backportRun } from './backportRun';
import { ConfigFileOptions } from './entrypoint.module';
const processArgs = process.argv.slice(2);

// this is the entrypoint when running from command line
backportRun(processArgs).then((backportResponse) => {
  const argv = yargsParser(processArgs) as ConfigFileOptions;
  const ci = argv.ci;
  if (ci) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(backportResponse));
  }
});
