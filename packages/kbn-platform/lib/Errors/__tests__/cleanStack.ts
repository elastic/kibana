import { relative } from 'path';

/**
 * Make all paths in stacktrace relative.
 */
export const cleanStack = (stack: string) =>
  stack
    .split('\n')
    .filter(
      line => !line.includes('node_modules/') && !line.includes('internal/')
    )
    .map(line => {
      const parts = /.*\((.*)\).?/.exec(line) || [];

      if (parts.length === 0) {
        return line;
      }

      const path = parts[1];
      return line.replace(path, relative(process.cwd(), path));
    })
    .join('\n');
