import {
  repoExists,
  deleteRepo,
  cloneRepo,
  addRemote,
  deleteRemote
} from '../services/git';
import ora = require('ora');
import { mkdirp } from '../services/rpc';
import { getRepoOwnerPath } from '../services/env';
import { BackportOptions } from '../options/options';

export async function maybeSetupRepo(options: BackportOptions) {
  const isAlreadyCloned = await repoExists(options);

  // clone repo if folder does not already exists
  if (!isAlreadyCloned) {
    const spinner = ora().start();
    try {
      const spinnerCloneText = 'Cloning repository (one-time operation)';
      spinner.text = `0% ${spinnerCloneText}`;
      await mkdirp(getRepoOwnerPath(options));

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

  // ensure remote are setup with latest accessToken
  await deleteRemote(options, options.username);
  await addRemote(options, options.username);

  if (options.username !== options.repoOwner) {
    await deleteRemote(options, options.repoOwner);
    await addRemote(options, options.repoOwner);
  }
}
