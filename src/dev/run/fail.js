import { inspect } from 'util';

const FAIL_TAG = Symbol('fail error');

export function createFailError(reason, exitCode = 1) {
  const error = new Error(reason);
  error.exitCode = exitCode;
  error[FAIL_TAG] = true;
  return error;
}

export function isFailError(error) {
  return Boolean(error && error[FAIL_TAG]);
}

export function combineErrors(errors) {
  if (errors.length === 1) {
    return errors[0];
  }

  const exitCode = errors
    .filter(isFailError)
    .reduce((acc, error) => Math.max(acc, error.exitCode), 1);

  const message = errors.reduce((acc, error) => {
    if (isFailError(error)) {
      return acc + '\n' + error.message;
    }

    return acc + `\nUNHANDLED ERROR\n${inspect(error)}`;
  }, '');

  return createFailError(`${errors.length} errors:\n${message}`, exitCode);
}
