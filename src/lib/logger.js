const logger = {};
logger.log = (...args) => {
  console.log(...args);
};

logger.error = (...args) => {
  console.error(...args);
};

module.exports = logger;
