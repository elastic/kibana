const ERROR_CODES = {
  HANDLED_ERROR_ERROR_CODE: 'HANDLED_ERROR_ERROR_CODE'
};

class HandledError extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, HandledError);
    this.code = ERROR_CODES.HANDLED_ERROR_ERROR_CODE;
    this.message = message;
  }
}

module.exports = {
  ERROR_CODES,
  HandledError
};
