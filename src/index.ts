#!/usr/bin/env node

import { getOptions } from './options/options';
import { initSteps } from './steps/steps';

async function init() {
  try {
    const args = process.argv.slice(2);
    const options = await getOptions(args);
    return await initSteps(options);
  } catch (e) {
    if (e.name === 'HandledError') {
      console.error(e.message);
    } else {
      console.error(e);
    }

    process.exit(1);
  }
}

init();
