#!/usr/bin/env node
import { main } from './main';
const args = process.argv.slice(2);

// this is the entrypoint when running from command line
main(args);
