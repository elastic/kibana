const oldHandler = window.onerror;

// React will delegate to window.onerror, even when errors are caught with componentWillCatch,
// so check for a known custom error type and skip the default error handling when we find one
window.onerror = (err, url, line) => {
  // know errors to skip for, see public/lib/errors.js
  const knownErrors = [
    'RenderError',
  ];

  const msg = err.message || err.toString();

  const isKnownError = knownErrors.find(errorName => msg.indexOf(errorName) >= 0);

  if (!isKnownError) {
    oldHandler(err, url, line);
  }
};
