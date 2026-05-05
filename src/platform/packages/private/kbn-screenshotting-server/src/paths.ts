/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

export interface PackageInfo {
  platform: 'linux' | 'darwin' | 'win32';
  architecture: 'x64' | 'arm64';
  archiveFilename: string;
  archiveChecksum: string;
  binaryChecksum: string;
  binaryRelativePath: string;
  isPreInstalled: boolean;
  location: 'custom' | 'chromeForTesting';
}

enum BaseUrl {
  // A GCS bucket under the Kibana team
  custom = 'https://storage.googleapis.com/headless_shell',
  // GCS bucket for headless chrome provided by the chrome team, see
  // https://github.com/GoogleChromeLabs/chrome-for-testing#json-api-endpoints
  chromeForTesting = 'https://storage.googleapis.com/chrome-for-testing-public',
}

interface CustomPackageInfo extends PackageInfo {
  location: 'custom';
}

interface ChromeForTestingPackageInfo extends PackageInfo {
  version: string;
  location: 'chromeForTesting';
  archivePath: string;
}

function isChromeForTestingPackage(p: PackageInfo): p is ChromeForTestingPackageInfo {
  return p.location === 'chromeForTesting';
}

export class ChromiumArchivePaths {
  public readonly packages: Array<CustomPackageInfo | ChromeForTestingPackageInfo> = [
    {
      platform: 'darwin',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-mac-x64.zip',
      archiveChecksum: '46320420f1da7fd14175b90c06dcfd30c11c2e40ca1a5f43646d0a4ab6d4d9ef',
      binaryChecksum: 'bec651dced4535f2f294ef4779881c16346a58d5b93c1f1ecee2d0103d6566ef',
      binaryRelativePath: 'chrome-headless-shell-mac-x64/chrome-headless-shell',
      version: '147.0.7727.57',
      location: 'chromeForTesting',
      archivePath: 'mac-x64',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-headless-shell-mac-arm64.zip',
      archiveChecksum: 'afbd0bbe8d5fc0d433d9b1b79e3c6120a7696e601d55bf0d53d81725f1e80bb5',
      binaryChecksum: '722e23459b8b0491c27544f47860ab455f2d94862549e0f3b92a5b951f95a16a',
      binaryRelativePath: 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
      version: '147.0.7727.57',
      location: 'chromeForTesting',
      archivePath: 'mac-arm64',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-b4f28b5-locales-linux_x64.zip',
      archiveChecksum: 'efd7a66a80676445903a35630d8daa4ed9d43303b91f732c3b34fb8ebfd6ebd3',
      binaryChecksum: '28af63c61ffbd168f0abb64b598a9bc5040ccd698972d0b51fafbbfb8be256d2',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-b4f28b5-locales-linux_arm64.zip',
      archiveChecksum: '0dc4a278fad6565be53527896d29af515588a46a0742183df4f747962d316f87',
      binaryChecksum: '92dd10cc9bae93c3f1ac355f0150cb3d4ee2e133899e01959f649809456ac11d',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-win64.zip',
      archiveChecksum: '3a307c54e11f22971dd1d6523ea96d2378ca05f1063e52418ca0b0e07e9e561e',
      binaryChecksum: '82266bf0eff5372246721a4dfab695737cd4adbbf0528bb3a489a3582520e05d',
      binaryRelativePath: path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      version: '147.0.7727.57',
      location: 'chromeForTesting',
      archivePath: 'win64',
      isPreInstalled: true,
    },
  ];

  // zip files get downloaded to a .chromium directory in the kibana root
  public readonly archivesPath = path.resolve(__dirname, '../../../../../../.chromium');

  public find(platform: string, architecture: string, packages: PackageInfo[] = this.packages) {
    return packages.find((p) => p.platform === platform && p.architecture === architecture);
  }

  public resolvePath(p: PackageInfo) {
    // adding architecture to the path allows it to download two binaries that have the same name, but are different architecture
    return path.resolve(this.archivesPath, p.architecture, p.archiveFilename);
  }

  public getAllArchiveFilenames(): string[] {
    return this.packages.map((p) => this.resolvePath(p));
  }

  public getDownloadUrl(p: PackageInfo) {
    if (isChromeForTestingPackage(p)) {
      const { chromeForTesting } = BaseUrl;
      const { archivePath, version, archiveFilename } = p;
      // returned string matches download value found at the following endpoint;
      // https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json
      return `${chromeForTesting}/${version}/${archivePath}/${archiveFilename}`;
    }

    return BaseUrl.custom + '/' + p.archiveFilename; // revision is not used for URL if package is a custom build
  }

  public getBinaryPath(p: PackageInfo, chromiumPath: string) {
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
