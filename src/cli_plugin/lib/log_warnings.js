export default function (settings, logger) {
  process.on('warning', (warning) => {
    logger.error(warning);
  });
}
