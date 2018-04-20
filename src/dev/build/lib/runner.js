import chalk from 'chalk';

import { isErrorLogged, markErrorLogged } from './errors';

import { createBuild } from './build';

export function createRunner({ config, log, buildOssDist, buildDefaultDist }) {
  async function execTask(desc, fn, ...args) {
    log.info(desc);
    log.indent(4);

    const start = Date.now();
    const time = () => {
      const sec = (Date.now() - start) / 1000;
      const minStr = sec > 60 ? `${Math.floor(sec / 60)} min ` : '';
      const secStr = `${Math.round(sec % 60)} sec`;
      return chalk.dim(`${minStr}${secStr}`);
    };

    try {
      await fn(config, log, ...args);
      log.success(chalk.green('✓'), time());
    } catch (error) {
      if (!isErrorLogged(error)) {
        log.error('failure', time());
        log.error(error);
        markErrorLogged(error);
      }

      throw error;
    } finally {
      log.indent(-4);
      log.write('');
    }
  }

  const builds = [];
  if (buildDefaultDist) {
    builds.push(
      createBuild({
        config,
        oss: false,
      })
    );
  }
  if (buildOssDist) {
    builds.push(
      createBuild({
        config,
        oss: true,
      })
    );
  }

  /**
   * Run a task by calling its `run()` method with three arguments:
   *    `config`: an object with methods for determining top-level config values, see `./config.js`
   *    `log`: an instance of the `ToolingLog`, see `../../tooling_log/tooling_log.js`
   *    `builds?`: If task does is not defined as `global: true` then it is called for each build and passed each one here.
   *
   * @param  {Task} task
   * @return {Promise<undefined>}
   */
  return async function run(task) {
    if (task.global) {
      await execTask(chalk`{dim [  global  ]} ${task.description}`, task.run);
    } else {
      for (const build of builds) {
        await execTask(`${build.getLogTag()} ${task.description}`, task.run, build);
      }
    }
  };
}
