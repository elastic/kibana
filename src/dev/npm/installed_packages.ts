/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { relative, resolve } from 'path';
import { readFileSync } from 'fs';
import { promisify } from 'util';

import licenseChecker from 'license-checker';

export type InstalledPackage = NonNullable<ReturnType<typeof readModuleInfo>>;

export interface PackageDetails {
  name: string;
  version: string;
  relative: string;
  licenses: string[];
  directory: string;
  repository: string | undefined;
}

interface Options {
  productionOnly?: boolean;
  developmentOnly?: boolean;
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
  projectPath: string,
  options: Options
): PackageDetails | undefined {
  const directory = (moduleInfo as any).realPath as string;

  // exclude root packages
  if (directory === projectPath) {
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
    repository: moduleInfo.repository,
    directory,
    relative: relative(projectPath, directory),
    licenses: toArray(
      override ? override : resolveLicenses(isPrivate, directory, moduleInfo.licenses)
    ),
  };
}

async function _getInstalledPackages(directory: string, options: Options) {
  const packages = await promisify(licenseChecker.init)({
    ...{
      start: directory,
      json: true,
      customFormat: {
        realPath: true,
        licenseText: false,
        licenseFile: false,
      },
    },
    ...(options.productionOnly && { production: true }),
    ...(options.developmentOnly && { development: true }),
  } as any);

  return Object.keys(packages).reduce((acc: any, pkgAndVersion) => {
    const pkg = packages[pkgAndVersion];
    const installedPackage = readModuleInfo(pkgAndVersion, pkg, directory, options);

    if (installedPackage) {
      acc[pkgAndVersion] = installedPackage;
    }

    return acc;
  }, {});
}

/**
 *  Get a list of objects with details about each installed NPM package.
 */
export async function getInstalledPackages(directories: string[], options: Options = {}) {
  const packagePromises = directories.map(directory => {
    return _getInstalledPackages(directory, options);
  });

  const dirPackages = await Promise.all(packagePromises);
  const results = dirPackages.reduce((acc, packages) => {
    return { ...acc, ...packages };
  }, {});

  return Object.values(results) as PackageDetails[];
}
