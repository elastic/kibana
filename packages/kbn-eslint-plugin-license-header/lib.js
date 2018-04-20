exports.assert = function assert(truth, message) {
  if (truth) {
    return;
  }

  const error = new Error(message);
  error.failedAssertion = true;
  throw error;
};

exports.normalizeWhitespace = function normalizeWhitespace(string) {
  return string.replace(/\s+/g, ' ');
};

exports.init = function (context, program, initStep) {
  try {
    return initStep();
  } catch (error) {
    if (error.failedAssertion) {
      context.report({
        node: program,
        message: error.message
      });
    } else {
      throw error;
    }
  }
};
