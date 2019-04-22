import stripJsonComments from 'strip-json-comments';
import { HandledError } from '../../services/HandledError';
import { readFile } from '../../services/rpc';

export async function readConfigFile<T = never>(filepath: string): Promise<T> {
  const fileContents = await readFile(filepath, 'utf8');
  const configWithoutComments = stripJsonComments(fileContents);

  try {
    return JSON.parse(configWithoutComments);
  } catch (e) {
    throw new HandledError(
      `"${filepath}" contains invalid JSON:\n\n${fileContents}\n\nTry validating the file on https://jsonlint.com/`
    );
  }
}
