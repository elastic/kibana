export default function (settings, logger) {
  process.on('warning', warning => {
    // deprecation warnings do no reflect a current problem for
    // the user and therefor should be filtered out.
    if (warning.name === 'DeprecationWarning') {
      return;
    }

    logger.error(warning);
  });
}
