import execa from 'execa';
import chalk from 'chalk';
import logTransformer from 'strong-log-transformer';
import logSymbols from 'log-symbols';

function generateColors() {
  const colorWheel = ['cyan', 'magenta', 'blue', 'yellow', 'green', 'red'].map(
    name => chalk[name]
  );
  const count = colorWheel.length;
  let children = 0;

  return () => colorWheel[children++ % count];
}

export function spawn(command, args, opts) {
  return execa(command, args, {
    ...opts,
    stdio: 'inherit',
  });
}

const nextColor = generateColors();

export function spawnStreaming(command, args, opts, { prefix }) {
  const spawned = execa(command, args, {
    ...opts,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const color = nextColor();
  const prefixedStdout = logTransformer({ tag: `${color.bold(prefix)}:` });
  const prefixedStderr = logTransformer({
    tag: `${logSymbols.error} ${color.bold(prefix)}:`,
    mergeMultiline: true,
  });

  spawned.stdout.pipe(prefixedStdout).pipe(process.stdout);
  spawned.stderr.pipe(prefixedStderr).pipe(process.stderr);

  return spawned;
}
