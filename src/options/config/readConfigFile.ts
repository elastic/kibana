import stripJsonComments from 'strip-json-comments';
import { HandledError } from '../../services/HandledError';
import { readFile } from '../../services/fs-promisified';
import { ConfigFileOptions } from '../ConfigOptions';

export async function readConfigFile(
  filepath: string
): Promise<ConfigFileOptions> {
  const fileContents = await readFile(filepath, 'utf8');
  const configWithoutComments = stripJsonComments(fileContents);

  try {
    return JSON.parse(configWithoutComments);
  } catch (e) {
    throw new HandledError(
      `"${filepath}" contains invalid JSON:\n\n${fileContents}`
    );
  }
}
