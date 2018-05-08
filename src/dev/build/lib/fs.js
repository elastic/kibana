import fs from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname, isAbsolute } from 'path';
import { createGunzip } from 'zlib';

import vfs from 'vinyl-fs';
import { promisify } from 'bluebird';
import mkdirpCb from 'mkdirp';
import { createPromiseFromStreams, createMapStream } from '../../../utils';

import { Extract } from 'tar';

const mkdirpAsync = promisify(mkdirpCb);
const statAsync = promisify(fs.stat);
const chmodAsync = promisify(fs.chmod);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const utimesAsync = promisify(fs.utimes);

function assertAbsolute(path) {
  if (!isAbsolute(path)) {
    throw new TypeError(
      'Please use absolute paths to keep things explicit. You probably want to use `build.resolvePath()` or `config.resolveFromRepo()`.'
    );
  }
}

export async function mkdirp(path) {
  assertAbsolute(path);
  await mkdirpAsync(path);
}

export async function write(path, contents) {
  assertAbsolute(path);
  await mkdirp(dirname(path));
  await writeFileAsync(path, contents);
}

export async function read(path) {
  assertAbsolute(path);
  return await readFileAsync(path, 'utf8');
}

export async function getChildPaths(path) {
  assertAbsolute(path);
  const childNames = await readdirAsync(path);
  return childNames.map(name => resolve(path, name));
}

export async function copy(source, destination) {
  assertAbsolute(source);
  assertAbsolute(destination);

  const stat = await statAsync(source);

  // mkdirp after the stat(), stat will throw if source
  // doesn't exist and ideally we won't create the parent directory
  // unless the source exists
  await mkdirp(dirname(destination));

  await createPromiseFromStreams([
    fs.createReadStream(source),
    fs.createWriteStream(destination),
  ]);

  await chmodAsync(destination, stat.mode);
}

export async function copyAll(sourceDir, destination, options = {}) {
  const {
    select = ['**/*'],
    dot = false,
    time,
  } = options;

  assertAbsolute(sourceDir);
  assertAbsolute(destination);

  await createPromiseFromStreams([
    vfs.src(select, {
      buffer: false,
      cwd: sourceDir,
      base: sourceDir,
      dot,
    }),
    vfs.dest(destination),
    ...(Boolean(time) ? [createMapStream(file => utimesAsync(file.path, time, time))] : []),
  ]);
}

export async function getFileHash(path, algo) {
  assertAbsolute(path);

  const hash = createHash(algo);
  const readStream = fs.createReadStream(path);
  await new Promise((resolve, reject) => {
    readStream
      .on('data', chunk => hash.update(chunk))
      .on('error', reject)
      .on('end', resolve);
  });

  return hash.digest('hex');
}

export async function untar(source, destination, extractOptions = {}) {
  assertAbsolute(source);
  assertAbsolute(destination);

  await createPromiseFromStreams([
    fs.createReadStream(source),
    createGunzip(),
    new Extract({
      ...extractOptions,
      path: destination
    }),
  ]);
}
