import { fetchDefaultRepoBranchAndPerformStartupChecks } from '../services/github/v4/fetchDefaultRepoBranchAndPerformStartupChecks';
import { PromiseReturnType } from '../types/PromiseReturnType';
import { updateLogger } from './../services/logger';
import { ConfigOptions } from './ConfigOptions';
import { getOptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';
import { getValidatedOptions } from './getValidatedOptions';

export type ValidConfigOptions = Readonly<PromiseReturnType<typeof getOptions>>;
export async function getOptions(
  argv: string[],
  optionsFromModule?: ConfigOptions
) {
  const optionsFromConfig = await getOptionsFromConfigFiles(
    optionsFromModule?.ci
  );
  const optionsFromCli = getOptionsFromCliArgs(
    { ...optionsFromConfig, ...optionsFromModule },
    argv
  );

  // update logger
  updateLogger(optionsFromCli);

  // TODO: move `getValidatedOptions` to `getOptionsFromCliArgs`
  const validatedOptions = getValidatedOptions(optionsFromCli);

  // TODO: make `username` optional by defaulting to `currentUsername`
  const { defaultBranch } = await fetchDefaultRepoBranchAndPerformStartupChecks(
    validatedOptions
  );

  return {
    ...validatedOptions,

    // use the default branch as source branch (normally "master") unless an explicit `sourceBranch` has been given
    sourceBranch: validatedOptions.sourceBranch
      ? validatedOptions.sourceBranch
      : defaultBranch,
  };
}
