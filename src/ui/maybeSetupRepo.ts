import ora = require('ora');
import { ValidConfigOptions } from '../options/options';
import {
  addRemote,
  cloneRepo,
  deleteRemote,
  deleteRepo,
  repoExists,
} from '../services/git';

export async function maybeSetupRepo(options: ValidConfigOptions) {
  const isAlreadyCloned = await repoExists(options);

  // clone repo if folder does not already exists
  if (!isAlreadyCloned) {
    const spinner = ora().start();
    try {
      const spinnerCloneText = 'Cloning repository (one-time operation)';
      spinner.text = `0% ${spinnerCloneText}`;

      await cloneRepo(options, (progress: string) => {
        spinner.text = `${progress}% ${spinnerCloneText}`;
      });

      spinner.succeed(`100% ${spinnerCloneText}`);
    } catch (e) {
      spinner.fail();
      await deleteRepo(options);
      throw e;
    }
  }

  // delete default "origin" remote to avoid confusion
  await deleteRemote(options, 'origin');

  // ensure remote are setup with latest accessToken
  await deleteRemote(options, options.authenticatedUsername);
  await addRemote(options, options.authenticatedUsername);

  // update remote for origin (if the above is a fork)
  if (options.authenticatedUsername !== options.repoOwner) {
    await deleteRemote(options, options.repoOwner);
    await addRemote(options, options.repoOwner);
  }
}
