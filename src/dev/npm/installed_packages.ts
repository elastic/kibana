/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { relative, resolve } from 'path';
import { readFileSync } from 'fs';
import { promisify } from 'util';

import licenseChecker from 'license-checker';

export type InstalledPackage = NonNullable<ReturnType<typeof readModuleInfo>>;
interface Options {
  directory: string;
  includeDev?: boolean;
  licenseOverrides?: { [pgkNameAndVersion: string]: string[] };
}

const toArray = <T>(input: T | T[]) => ([] as T[]).concat(input);

function resolveLicenses(
  isPrivate: boolean,
  realPath: string,
  licenses: string[] | string | undefined
) {
  // `license-checker` marks all packages that have `private: true`
  // in their `package.json` as "UNLICENSED", so we try to lookup the
  // actual license by reading the license field from their package.json
  if (isPrivate && licenses === 'UNLICENSED') {
    try {
      const pkg = JSON.parse(readFileSync(resolve(realPath, 'package.json'), 'utf8'));
      if (!pkg.license) {
        throw new Error('no license field');
      }
      return [pkg.license as string];
    } catch (error) {
      throw new Error(
        `Unable to detect license for \`"private": true\` package at ${realPath}: ${error.message}`
      );
    }
  }

  return toArray(licenses || []);
}

function readModuleInfo(
  pkgAndVersion: string,
  moduleInfo: licenseChecker.ModuleInfo,
  dev: boolean,
  options: Options
) {
  const directory = (moduleInfo as any).realPath as string;
  if (directory === options.directory) {
    return;
  }

  const isPrivate = !!(moduleInfo as any).private as boolean;
  const keyParts = pkgAndVersion.split('@');
  const name = keyParts.slice(0, -1).join('@');
  const version = keyParts[keyParts.length - 1];
  const override = options.licenseOverrides && options.licenseOverrides[pkgAndVersion];

  return {
    name,
    version,
    isDevOnly: dev,
    repository: moduleInfo.repository,
    directory,
    relative: relative(options.directory, directory),
    licenses: toArray(
      override ? override : resolveLicenses(isPrivate, directory, moduleInfo.licenses)
    ),
  };
}

async function _getInstalledPackages(dev: boolean, options: Options) {
  const lcResult = await promisify(licenseChecker.init)({
    start: options.directory,
    development: dev,
    production: !dev,
    json: true,
    customFormat: {
      realPath: true,
      licenseText: false,
      licenseFile: false,
    },
  } as any);

  const result = [];

  for (const [pkgAndVersion, moduleInfo] of Object.entries(lcResult)) {
    const installedPackage = readModuleInfo(pkgAndVersion, moduleInfo, dev, options);
    if (installedPackage) {
      result.push(installedPackage);
    }
  }

  return result;
}

/**
 *  Get a list of objects with details about each installed
 *  NPM package.
 */
export async function getInstalledPackages(options: Options) {
  return [
    ...(await _getInstalledPackages(false, options)),
    ...(options.includeDev ? await _getInstalledPackages(true, options) : []),
  ];
}
