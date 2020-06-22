import { getDefaultRepoBranchAndPerformStartupChecks } from '../services/github/v4/getDefaultRepoBranchAndPerformStartupChecks';
import { PromiseReturnType } from '../types/PromiseReturnType';
import { ConfigOptions } from './ConfigOptions';
import { getOptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';
import { getValidatedOptions } from './getValidatedOptions';

export type BackportOptions = Readonly<PromiseReturnType<typeof getOptions>>;
export async function getOptions(
  argv: string[],
  optionsFromModule?: ConfigOptions
) {
  const optionsFromConfig = await getOptionsFromConfigFiles();
  const optionsFromCli = getOptionsFromCliArgs(
    { ...optionsFromConfig, ...optionsFromModule },
    argv
  );

  const validatedOptions = getValidatedOptions(optionsFromCli);

  const { defaultBranch } = await getDefaultRepoBranchAndPerformStartupChecks(
    validatedOptions
  );

  return {
    ...validatedOptions,

    // use the default branch as source branch (normally master) unless an explicit `sourceBranch` has been given
    sourceBranch: validatedOptions.sourceBranch
      ? validatedOptions.sourceBranch
      : defaultBranch,
  };
}
