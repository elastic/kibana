/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable */

import fs from 'fs';
import nock from 'nock';
import os from 'os';
import path from 'path';
import tar from 'tar-fs';
import URL from 'url';
import zlib from 'zlib';
import { LanguageServers } from './language_servers';
import { InstallManager } from "./install_manager";
import { ServerOptions } from "../server_options";
import rimraf from 'rimraf';
import { LanguageServerStatus } from '../../common/language_server';

const LANG_SERVER_NAME = 'Java';
const langSrvDef = LanguageServers.find(l => l.name === LANG_SERVER_NAME)!;

const fakeTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foo-'));
const fakePackageFile: string = path.join(fakeTestDir, 'fakePackage.tar.gz');
const fakeTarDir = path.join(fakeTestDir, 'fakePackage');
const fakeFile = 'fake.file';
const fakeContent = 'fake content';
// @ts-ignore
const options: ServerOptions = {
  langServerPath: fakeTestDir
};

const manager = new InstallManager(options);

beforeAll(async () => {
  console.log('test folder is: ' + fakeTestDir);

  fs.mkdirSync(fakeTarDir);
  // create a fake tar.gz package for testing
  fs.writeFileSync(path.join(fakeTarDir, fakeFile), fakeContent);
  return await new Promise(resolve => {
    tar
      .pack(fakeTarDir)
      .pipe(zlib.createGzip())
      .pipe(fs.createWriteStream(fakePackageFile))
      .on('finish', resolve);
  });

});
beforeEach(() => {
  const downloadUrl = URL.parse(langSrvDef.downloadUrl!(langSrvDef));
  nock.cleanAll();
  // mimic github's behavior, redirect to a s3 address
  nock(`${downloadUrl.protocol}//${downloadUrl.host!}`)
    .get(downloadUrl.path!)
    .reply(302, '', {
      Location: 'https://s3.amazonaws.com/file.tar.gz',
    });
  nock('https://s3.amazonaws.com')
    .get('/file.tar.gz')
    .replyWithFile(200, fakePackageFile, {
      'Content-Length': fs.statSync(fakePackageFile).size.toString(),
      'Content-Disposition': `attachment ;filename=${path.basename(fakePackageFile)}`
    });
});
afterEach(() => {
  rimraf.sync(manager.installationPath(langSrvDef));
});
afterAll(() => {
  nock.cleanAll();
  rimraf.sync(fakeTestDir);
});
 

test('it can download a package', async() => {
  const manager = new InstallManager(options);
  const p = await manager.downloadFile(langSrvDef);
  console.log('package downloaded at ' + p);
  expect(fs.existsSync(p)).toBeTruthy();
  expect(fs.statSync(p).size).toBe(fs.statSync(fakePackageFile).size)
});

test('it can install language server', async() => {
  expect(manager.status(langSrvDef)).toBe(LanguageServerStatus.NOT_INSTALLED);
  const installPromise =  manager.install(langSrvDef);
  expect(manager.status(langSrvDef)).toBe(LanguageServerStatus.INSTALLING);
  await installPromise;
  expect(manager.status(langSrvDef)).toBe(LanguageServerStatus.READY);
  const installPath = manager.installationPath(langSrvDef);
  const fakeFilePath = path.join(installPath, fakeFile);
  expect(fs.existsSync(fakeFilePath)).toBeTruthy();
  expect(fs.readFileSync(fakeFilePath, 'utf8')).toBe(fakeContent);
});
