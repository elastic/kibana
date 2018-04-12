const ERROR_CODES = {
  ABORT_APPLICATION_ERROR_CODE: 'ABORT_APPLICATION_ERROR_CODE',
  GITHUB_API_ERROR_CODE: 'GITHUB_API_ERROR_CODE',
  GITHUB_SSH_ERROR_CODE: 'GITHUB_SSH_ERROR_CODE',
  INVALID_CONFIG_ERROR_CODE: 'INVALID_CONFIG_ERROR_CODE',
  INVALID_JSON_ERROR_CODE: 'INVALID_JSON_ERROR_CODE',
  MISSING_DATA_ERROR_CODE: 'MISSING_DATA_ERROR_CODE'
};

class AbortApplicationError extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, AbortApplicationError);
    this.code = ERROR_CODES.ABORT_APPLICATION_ERROR_CODE;
    this.message = message;
  }
}

class GithubApiError extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, GithubApiError);
    this.code = ERROR_CODES.GITHUB_API_ERROR_CODE;
    this.message = JSON.stringify(message, null, 4);
  }
}
class GithubSSHError extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, GithubSSHError);
    this.code = ERROR_CODES.GITHUB_SSH_ERROR_CODE;
    this.message = message;
  }
}

class InvalidConfigError extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, InvalidConfigError);
    this.code = ERROR_CODES.INVALID_CONFIG_ERROR_CODE;
  }
}

class InvalidJsonError extends Error {
  constructor(message, filepath, fileContents) {
    super(message);
    Error.captureStackTrace(this, InvalidJsonError);
    this.code = ERROR_CODES.INVALID_JSON_ERROR_CODE;
    this.message = `"${filepath}" contains invalid JSON:\n\n${fileContents}\n\nTry validating the file on https://jsonlint.com/`;
  }
}

class MissingDataError extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, MissingDataError);
    this.code = ERROR_CODES.MISSING_DATA_ERROR_CODE;
    this.message = message;
  }
}

module.exports = {
  ERROR_CODES,
  AbortApplicationError,
  GithubApiError,
  GithubSSHError,
  InvalidConfigError,
  InvalidJsonError,
  MissingDataError
};
