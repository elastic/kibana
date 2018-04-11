const ERROR_CODES = {
  INVALID_CONFIG_ERROR_CODE: 'INVALID_CONFIG_ERROR_CODE',
  GITHUB_ERROR_CODE: 'GITHUB_ERROR_CODE',
  MISSING_DATA_ERROR_CODE: 'MISSING_DATA_ERROR_CODE',
  ABORT_APPLICATION_ERROR_CODE: 'ABORT_APPLICATION_ERROR_CODE',
  INVALID_JSON_ERROR_CODE: 'INVALID_JSON_ERROR_CODE'
};

class InvalidConfigError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, InvalidConfigError);
    this.code = ERROR_CODES.INVALID_CONFIG_ERROR_CODE;
  }
}

class GithubError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, GithubError);
    this.code = ERROR_CODES.GITHUB_ERROR_CODE;
    this.message = JSON.stringify(message, null, 4);
  }
}

class MissingDataError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, MissingDataError);
    this.code = ERROR_CODES.MISSING_DATA_ERROR_CODE;
    this.message = message;
  }
}

class AbortApplicationError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, MissingDataError);
    this.code = ERROR_CODES.ABORT_APPLICATION_ERROR_CODE;
    this.message = message;
  }
}

class InvalidJsonError extends Error {
  constructor(message, filepath, fileContents) {
    super(message);
    Error.captureStackTrace(this, MissingDataError);
    this.code = ERROR_CODES.INVALID_JSON_ERROR_CODE;
    this.message = `"${filepath}" contains invalid JSON:\n\n${fileContents}\n\nTry validating the file on https://jsonlint.com/`;
  }
}

module.exports = {
  ERROR_CODES,
  InvalidConfigError,
  GithubError,
  MissingDataError,
  AbortApplicationError,
  InvalidJsonError
};
