# dev/run

Helper functions for writing little scripts for random build/ci/dev tasks.

## Usage

Define the function that should validate the CLI arguments and call your task fn:

```ts
// dev/my_task/run_my_task.ts
import { createFlagError, run } from '../run';

run(
  async ({ flags, log }) => {
    if (typeof flags.path !== 'string') {
      throw createFlagError('please provide a single --path flag');
    }

    await runTask(flags.path);
    log.success('task complete');
  },
  {
    description: `
      Run my special task
    `,
    flags: {
      string: ['path'],
      help: `
        --path             Required, path to the file to operate on
      `
    },
  }
);
```

Define the script which will setup node and load the script source:

```js
// scripts/my_task.js

require('../src/setup_node_env');
require('../src/dev/my_task/run_my_task');
```

Try out the script:

```sh
$ node scripts/my_task

# ERROR please provide a single --path flag
# 
#   node scripts/my_task.js
# 
#   Run my special task
# 
#   Options:
#     --path             Required, path to the file to operate on
#     --verbose, -v      Log verbosely
#     --debug            Log debug messages (less than verbose)
#     --quiet            Only log errors
#     --silent           Don't log anything
#     --help             Show this message
#
```

## API

- ***`run(fn: async ({ flags: Flags, log: ToolingLog, addCleanupTask }) => Promise<void>, options: Options)`***
  
    Execte an async function, passing it the parsed flags and a tooling log that is configured to the requested logging level. If the returned promise is rejected with an error created by `createFailError(...)` or `createFlagError(...)` the process will exit as described by the error, otherwise the process will exit with code 1.
    
    **`fn` Params:**
    - *[`log: ToolingLog`](../../../packages/kbn-dev-utils/src/tooling_log/tooling_log.js)*:

      An instance of the `ToolingLog` that is configured with the standard flags: `--verbose`, `--quiet`, `--silent`, and `--debug`

    - *[`flags: Flags`](flags.ts)*:

      The parsed CLI flags, created by [`getopts`](https://www.npmjs.com/package/getopts). Includes the default flags for controlling the log level of the ToolingLog, and `flags.unexpected`, which is an array of flag names which were passed but not expected.

    - *`addCleanupTask: (task: CleanupTask) => void`*:

      A function that registers a task to be called __once__ as soon as one of the following occurs:

      1. `fn` resolve/rejects
      2. something calls `process.exit()`
      3. the user hits <kbd>ctrl</kbd>+<kbd>c</kbd> in their terminal causing the SIGINT signal to be sent to the process

    **`Options`:**
    - *`usage: string`*

      A bit of text to replace the default usage in the `--help` text.

    - *`description: string`*

      A bit of text to replace the default description in the `--help` text.

    - *`flags.help: string`*

      A bit of text included at the top of the `Options:` section of the `--help` text.

    - *`flags.string: string[]`*

      An array of flag names that are expected to have a string value.

    - *`flags.boolean: string[]`*

      An array of flag names that are expected to have a boolean value.

    - *`flags.alias: { [short: string], string }`*

      A map of short flag names to long flag names, used to expand short flags like `-v` to `--verbose`.

    - *`flags.default: { [name: string]: string | string[] | boolean | undefined }`*

      A map of flag names to their default value. If the flag is not defined this value will be set in the flags object passed to the run `fn`.

    - *`flags.allowUnexpected: boolean`*

      By default, any flag that is passed but not mentioned in `flags.string`, `flags.boolean`, `flags.alias` or `flags.default` will trigger an error, preventing the run function from calling its first argument. If you have a reason to disable this behavior set this option to `true`.


- ***`createFailError(reason: string, options: { exitCode: number, showHelp: boolean }): FailError`***
    
    Create and return an error object that, when thrown within `run(...)` can customize the failure behavior of the CLI. `reason` is printed instead of a stacktrace, `options.exitCode` customizes the exit code of the process, and `options.showHelp` will print the help text before exiting.

- ***`createFlagError(reason: string)`***

    Shortcut for calling `createFailError()` with `options.showHelp`, as errors caused by invalid flags should print the help message to help users debug their usage.

- ***`isFailError(error: any)`***

    Determine if a value is an error created by `createFailError(...)`.