#!/usr/bin/env node
import { main } from './main';
import { initLogger } from './services/logger';
const args = process.argv.slice(2);

initLogger();

// this is the entrypoint when running from command line
main(args);
