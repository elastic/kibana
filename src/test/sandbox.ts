import path, { resolve } from 'path';
import del from 'del';
import makeDir from 'make-dir';

jest.unmock('make-dir');
jest.unmock('del');

export function getSandboxPath({
  filename,
  specname,
}: {
  filename: string;
  specname?: string;
}) {
  const baseFilename = getFilenameWithoutExtension(filename);
  return resolve(
    `${__dirname}/_tmp_sandbox_/${baseFilename}${
      specname ? `/${specname}` : ''
    }`
  );
}

export async function resetSandbox(sandboxPath: string) {
  await del(sandboxPath);
  await makeDir(sandboxPath);
}

function getFilenameWithoutExtension(filename: string) {
  return path.basename(filename, path.extname(filename));
}
