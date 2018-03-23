const $isCliError = Symbol('isCliError');

export function createCliError(message) {
  const error = new Error(message);
  error[$isCliError] = true;
  return error;
}

export function isCliError(error) {
  return error && !!error[$isCliError];
}
