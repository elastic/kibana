/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import yauzl from 'yauzl';
import yazl from 'yazl';

// The utilities in this file are largely copied with minor modifications from
// `x-pack/plugins/fleet/server/services/epm/extract.ts`. We can't import them directly
// in the bundled package task due to tsconfig limitation, so they're copied here instead.

export interface ZipEntry {
  path: string;
  buffer?: Buffer;
}

export async function unzipBuffer(buffer: Buffer): Promise<ZipEntry[]> {
  const zipEntries: ZipEntry[] = [];
  const zipfile = await yauzlFromBuffer(buffer, { lazyEntries: true });

  zipfile.readEntry();
  zipfile.on('entry', async (entry: yauzl.Entry) => {
    const path = entry.fileName;

    // Only include files, not directories
    if (path.endsWith('/')) {
      return zipfile.readEntry();
    }

    const entryBuffer = await getZipReadStream(zipfile, entry).then(streamToBuffer);
    zipEntries.push({ buffer: entryBuffer, path });

    zipfile.readEntry();
  });

  await new Promise((resolve, reject) => zipfile.on('end', resolve).on('error', reject));

  return zipEntries;
}

export async function createZipFile(entries: ZipEntry[], destination: string): Promise<Buffer> {
  const zipfile = new yazl.ZipFile();

  for (const entry of entries) {
    zipfile.addBuffer(entry.buffer || Buffer.from(''), entry.path);
  }

  return new Promise((resolve, reject) => {
    zipfile.outputStream.on('error', reject);

    zipfile.end();

    zipfile.outputStream
      .pipe(fs.createWriteStream(destination))
      .on('close', resolve)
      .on('error', reject);
  });
}

// Copied over some utilities from x-pack/plugins/fleet/server/services/epm/archive/extract.ts since we can't
// import them directly due to `tsconfig` limitations in the `kibana/src/` directory.
function yauzlFromBuffer(buffer: Buffer, opts: yauzl.Options): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, opts, (err?: Error, handle?: yauzl.ZipFile) =>
      err ? reject(err) : resolve(handle!)
    )
  );
}

function getZipReadStream(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) =>
    zipfile.openReadStream(entry, (err?: Error, readStream?: NodeJS.ReadableStream) =>
      err ? reject(err) : resolve(readStream!)
    )
  );
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
