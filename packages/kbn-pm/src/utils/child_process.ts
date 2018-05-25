import chalk from 'chalk';
import execa from 'execa';
import logSymbols from 'log-symbols';
import logTransformer from 'strong-log-transformer';

function generateColors() {
  const colorWheel = [
    chalk.cyan,
    chalk.magenta,
    chalk.blue,
    chalk.yellow,
    chalk.green,
    chalk.red,
  ];

  const count = colorWheel.length;
  let children = 0;

  return () => colorWheel[children++ % count];
}

export function spawn(command: string, args: string[], opts: execa.Options) {
  return execa(command, args, {
    ...opts,
    stdio: 'inherit',
  });
}

const nextColor = generateColors();

export function spawnStreaming(
  command: string,
  args: string[],
  opts: execa.Options,
  { prefix }: { prefix: string }
) {
  const spawned = execa(command, args, {
    ...opts,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const color = nextColor();
  const prefixedStdout = logTransformer({ tag: `${color.bold(prefix)}:` });
  const prefixedStderr = logTransformer({
    mergeMultiline: true,
    tag: `${logSymbols.error} ${color.bold(prefix)}:`,
  });

  spawned.stdout.pipe(prefixedStdout).pipe(process.stdout);
  spawned.stderr.pipe(prefixedStderr).pipe(process.stderr);

  return spawned;
}
