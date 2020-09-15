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
  args: string[] = []
) {
  return main(args, options);
}

// public API
export { BackportResponse } from './main';
export { ConfigOptions } from './options/ConfigOptions';
export { getTargetBranchForLabel } from './services/github/v4/getTargetBranchesFromLabels';
export { fetchMergedPullRequests } from './services/github/v4/fetchMergedPullRequests';
