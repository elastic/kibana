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
