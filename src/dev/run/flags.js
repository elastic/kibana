import { relative } from 'path';

import getopts from 'getopts';

export function getFlags(argv) {
  return getopts(argv, {
    alias: {
      v: 'verbose',
    },
    default: {
      verbose: false,
      quiet: false,
      silent: false,
      debug: false,
      help: false,
    }
  });
}

export function getHelp() {
  return (
    `
  node ${relative(process.cwd(), process.argv[1], '.js')}

  Runs a dev task

  Options:
    --verbose, -v      Log verbosely
    --debug            Log debug messages (less than verbose)
    --quiet            Only log errors
    --silent           Don't log anything
    --help             Show this message

`
  );
}
