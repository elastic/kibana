import * as colors from './colors';
import { ms } from './ms';

export function writeEpilogue(log, stats) {
  // header
  log.write();

  // passes
  log.write(
    `${colors.pass('%d passing')} (%s)`,
    stats.passes || 0,
    ms(stats.duration)
  );

  // pending
  if (stats.pending) {
    log.write(
      colors.pending('%d pending'),
      stats.pending
    );
  }

  // failures
  if (stats.failures) {
    log.write(
      '%d failing',
      stats.failures
    );
  }

  // footer
  log.write();
}
