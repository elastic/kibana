import SimpleGit from 'simple-git';
import { fromNode as fcb } from 'bluebird';
import { File } from './file';

export async function getFilesForCommit(path) {
  const simpleGit = new SimpleGit(path);

  const output = await fcb(cb => simpleGit.diff(['--name-status', '--cached'], cb));

  return output
    .split('\n')

    // Ignore blank lines
    .filter(line => line.trim().length > 0)

    // git diff --name-status outputs lines with two OR three parts
    // separated by a tab character
    .map(line => line.trim().split('\t'))

    .map(parts => new File({
      // the status is always the first part in each line
      status: parts[0],

      // - If the file is edited the line will only have two elements
      // - If the file is renamed it will have three
      // - In any case, the last element is the CURRENT name of the file
      path: parts[parts.length - 1]
    }))

    // ignore deleted files
    .filter(file => !file.isDeleted());
}
