import { clone } from 'lodash';

export function captureTerminal<T extends string[]>(
  fn: (argv: T) => any,
  argv: T
) {
  const _exit = process.exit;
  const _emit = process.emit;
  const _env = process.env;
  const _argv = process.argv;

  const _error = console.error;
  const _log = console.log;
  const _warn = console.warn;

  let exit = false;
  process.exit = () => {
    exit = true;
  };

  const env = clone(process.env);
  env._ = 'node';
  process.env = env;
  process.argv = argv;

  const errors: any[] = [];
  const logs: any[] = [];
  const warnings: any[] = [];

  console.error = (msg: any) => {
    errors.push(msg);
  };
  console.log = (msg: any) => {
    logs.push(msg);
  };
  console.warn = (msg: any) => {
    warnings.push(msg);
  };

  let result: T;

  try {
    result = fn(argv);
  } finally {
    reset();
  }

  return done();

  function reset() {
    process.exit = _exit;
    process.emit = _emit;
    process.env = _env;
    process.argv = _argv;

    console.error = _error;
    console.log = _log;
    console.warn = _warn;
  }

  function done() {
    reset();

    return {
      errors,
      logs,
      warnings,
      exit,
      result
    };
  }
}
