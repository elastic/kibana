/**
 * Tiny stdout logger that prints structured-ish progress lines, plus a
 * one-line status updater so long runs feel responsive.
 */

const isTty = process.stdout.isTTY === true;

export const log = (msg: string): void => {
  process.stdout.write(`${msg}\n`);
};

export const warn = (msg: string): void => {
  process.stderr.write(`WARN: ${msg}\n`);
};

export const err = (msg: string): void => {
  process.stderr.write(`ERROR: ${msg}\n`);
};

let lastStatus = '';
export const status = (msg: string): void => {
  if (!isTty) {
    if (msg !== lastStatus) {
      log(msg);
      lastStatus = msg;
    }
    return;
  }
  const clear = '\x1b[2K\r';
  process.stdout.write(`${clear}${msg}`);
  lastStatus = msg;
};

export const endStatus = (): void => {
  if (!isTty) return;
  if (lastStatus.length > 0) {
    process.stdout.write('\n');
    lastStatus = '';
  }
};

export const timer = (): { elapsed: () => number } => {
  const start = Date.now();
  return { elapsed: () => Date.now() - start };
};
