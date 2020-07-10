import { BackportOptions } from './options/options';
import { runWithArgs } from './runWithArgs';
const args = process.argv.slice(2);

export function run(options: Partial<BackportOptions>) {
  return runWithArgs(args, options);
}
