import stripJsonComments from 'strip-json-comments';
import { HandledError } from '../../services/HandledError';
import { readFile } from '../../services/fs-promisified';

export async function readConfigFile(filepath: string) {
  const fileContents = await readFile(filepath, 'utf8');
  const configWithoutComments = stripJsonComments(fileContents);

  try {
    return JSON.parse(configWithoutComments) as Record<string, unknown>;
  } catch (e) {
    throw new HandledError(
      `"${filepath}" contains invalid JSON:\n\n${fileContents}\n\nTry validating the file on https://jsonlint.com/`
    );
  }
}
