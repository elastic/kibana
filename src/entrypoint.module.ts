import { main } from './main';
import { ConfigOptions } from './options/ConfigOptions';

// this is the entry point when importing backport as module:
export function run(
  options: ConfigOptions,

  // cli args will not automatically be forwarded when consumed as a module (required/imported)
  // It is simple to forward args manually via `process.argv`:
  //
  // import { run } from `backport
  // const args = process.argv.slice(2);
  // run(options, args)
  //
  args = []
) {
  return main(args, options);
}
