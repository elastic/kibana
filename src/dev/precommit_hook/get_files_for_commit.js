import SimpleGit from 'simple-git';
import { fromNode as fcb } from 'bluebird';
import { File } from '../file';

/**
 * Get the files that are staged for commit (excluding deleted files)
 * as `File` objects that are aware of their commit status.
 *
 * @param  {String} repoPath
 * @return {Promise<Array<File>>}
 */
export async function getFilesForCommit(repoPath) {
  const simpleGit = new SimpleGit(repoPath);

  const output = await fcb(cb => simpleGit.diff(['--name-status', '--cached'], cb));

  return output
    .split('\n')
    // Ignore blank lines
    .filter(line => line.trim().length > 0)
    // git diff --name-status outputs lines with two OR three parts
    // separated by a tab character
    .map(line => line.trim().split('\t'))
    .map(parts => {
      // the status is always the first part in each line
      // .. If the file is edited the line will only have two elements
      // .. If the file is renamed it will have three
      // .. In any case, the last element is the CURRENT name of the file
      const status = parts[0];
      const path = parts[parts.length - 1];

      // ignore deleted files
      if (status === 'D') {
        return undefined;
      }

      return new File(path);
    })
    .filter(Boolean);
}
