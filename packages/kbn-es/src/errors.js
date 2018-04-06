exports.createCliError = function(message) {
  const error = new Error(message);
  error.isCliError = true;
  return error;
};

exports.isCliError = function(error) {
  return error && error.isCliError;
};
