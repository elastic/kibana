#!/usr/bin/env node

import { initSteps } from './steps/steps';
import { getOptions } from './options/options';

async function init() {
  try {
    const options = await getOptions(process.argv);
    return initSteps(options);
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
