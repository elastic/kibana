import { readFile } from 'fs/promises';
import stripJsonComments from 'strip-json-comments';
import { HandledError } from '../../services/HandledError';
import { excludeUndefined } from '../../utils/excludeUndefined';
import { ConfigFileOptions } from '../ConfigOptions';

export async function readConfigFile(
  filepath: string
): Promise<ConfigFileOptions> {
  const fileContents = await readFile(filepath, 'utf8');
  const configWithoutComments = stripJsonComments(fileContents);

  try {
    return withConfigMigrations(JSON.parse(configWithoutComments));
  } catch (e) {
    throw new HandledError(
      `"${filepath}" contains invalid JSON:\n\n${fileContents}`
    );
  }
}
// ensure backwards compatability when config options are renamed
export function withConfigMigrations({
  upstream,
  labels,
  branches,
  ...config
}: ConfigFileOptions) {
  const { repoName, repoOwner } = parseUpstream(upstream, config);

  return excludeUndefined({
    ...config,

    // `branches` was renamed `targetBranchChoices`
    targetBranchChoices: config.targetBranchChoices ?? branches,

    // `upstream` has been renamed to `repoOwner`/`repoName`
    repoName,
    repoOwner,

    // `labels` was renamed `targetPRLabels`
    targetPRLabels: config.targetPRLabels ?? labels,
  });
}

function parseUpstream(
  upstream: string | undefined,
  config: ConfigFileOptions
) {
  if (upstream) {
    const [repoOwner, repoName] = upstream.split('/');
    return { repoOwner, repoName };
  }

  return {
    repoOwner: config.repoOwner,
    repoName: config.repoName,
  };
}
