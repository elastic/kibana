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
  location: 'custom' | 'CfT';
  revision: number;
}

enum BaseUrl {
  // A GCS bucket under the Kibana team
  custom = 'https://storage.googleapis.com/headless_shell',
  // GCS bucket for headless chrome provided by the chrome team, see
  // https://github.com/GoogleChromeLabs/chrome-for-testing#json-api-endpoints
  CfT = 'https://storage.googleapis.com/chrome-for-testing-public',
}

interface CustomPackageInfo extends PackageInfo {
  location: 'custom';
}

interface ChromeForTestingPackageInfo extends PackageInfo {
  version: string;
  location: 'CfT';
  archivePath: string;
}

function isChromeForTestingPackage(p: PackageInfo): p is ChromeForTestingPackageInfo {
  return p.location === 'CfT';
}

export class ChromiumArchivePaths {
  public readonly packages: Array<CustomPackageInfo | ChromeForTestingPackageInfo> = [
    {
      platform: 'darwin',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-mac-x64.zip',
      archiveChecksum: 'c5495814e845db3f2bda288682a132e0abd32a3523d7d51f067303ef074faa12',
      binaryChecksum: 'e11604362e1c8605ce2a1694e0eabc8a00f00248276db1ce1e32a15e18d4c355',
      binaryRelativePath: 'chrome-headless-shell-mac-x64/chrome-headless-shell',
      revision: 1381561,
      version: '132.0.6834.0',
      location: 'CfT',
      archivePath: 'mac-x64',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-headless-shell-mac-arm64.zip',
      archiveChecksum: 'ead60a22ae13e93a74b88fe43df3aa547ca599d9f9b7fd4b060e5c595fd890cb',
      binaryChecksum: '8f60afb3cabee80b3e7efa6898d589997d5f6e3669b1bdc1bca4b8685e500e7f',
      binaryRelativePath: 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
      revision: 1415337,
      version: '134.0.6998.35',
      location: 'CfT',
      archivePath: 'mac-arm64',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-ea6ef4c-locales-linux_x64.zip',
      archiveChecksum: '98db5f4ae704a0cf4d1612721334b0466908bf642ac547798aa303d17105e782',
      binaryChecksum: '2ed0cbce8358e86b5c44719d1ccd50f711b879088946b6ffdeed22b4ce2e47ea',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1415337,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-ea6ef4c-locales-linux_arm64.zip',
      archiveChecksum: '9b3bf295794f0d4fe5e52813aa31a5ed4ca4389384f7fff2a8465777709174ea',
      binaryChecksum: '382c7f30a57b1096c7567d3a2cba0353aae80ec11790cd271601fb1b2ebb85cd',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1415337,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-win64.zip',
      archiveChecksum: 'e24c93a73f72142374642703b347ee31ecdb849aa092a1d2397ea54c9d9ffb2b',
      binaryChecksum: 'cb1b3604c8b8fdf657bdadffeed151a4e4d37b6ab0fb5a4474db0dd0043b31e9',
      binaryRelativePath: path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      revision: 1381561,
      version: '132.0.6834.0',
      location: 'CfT',
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
      const { CfT } = BaseUrl;
      const { archivePath, version, archiveFilename } = p;
      // returned string matches download value found at the following endpoint;
      // https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json
      return `${CfT}/${version}/${archivePath}/${archiveFilename}`;
    }

    return BaseUrl.custom + '/' + p.archiveFilename; // revision is not used for URL if package is a custom build
  }

  public getBinaryPath(p: PackageInfo, chromiumPath: string) {
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
