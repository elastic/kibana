import getopts from 'getopts';

const booleanOpts = ['skip-kibana', 'skip-kibana-extra'];
const kbnOptions = [...booleanOpts];

export const parseArgv = argv =>
  getopts(argv, {
    boolean: booleanOpts,
    alias: {
      h: 'help'
    }
  });

export const hasDashDash = args => args.includes('--');

export const createExtraArgs = (options) =>
  options._.slice(1).concat(toArgs(options));

function toArgs(options) {
  const args = [];

  for (const key of Object.keys(options)) {
    if (key === '_' || kbnOptions.includes(key)) {
      continue;
    }

    const value = options[key];
    if (value === true) {
      args.push(`--${key}`);
    } else {
      args.push(`--${key} ${value}`);
    }
  }

  return args;
}
