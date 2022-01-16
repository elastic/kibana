#!/usr/bin/env node
import { backportRun } from './backportRun';
const processArgs = process.argv.slice(2);

// this is the entrypoint when running from command line
backportRun(processArgs);
