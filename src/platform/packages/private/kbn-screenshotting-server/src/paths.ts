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
      archiveChecksum: '24685569bf964b062b302b0e6cd04628e4fe244527b4f17098b56d1b602bb4db',
      binaryChecksum: '8ffb983d07e9598e1f6990fb61b14862fb1964bf72a71675dbbcc0a6e5a929b0',
      binaryRelativePath: 'chrome-headless-shell-mac-x64/chrome-headless-shell',
      revision: 1381561,
      version: '132.0.6834.110',
      location: 'CfT',
      archivePath: 'mac-x64',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-headless-shell-mac-arm64.zip',
      archiveChecksum: '797877f4e3c104391878739e003a62887cf9ee149649b112e14c2cf6602071ea',
      binaryChecksum: '8a5d23be9e99cd3a820adf4a3b77741d299ea68f1bdc5bbc7719b690069a16df',
      binaryRelativePath: 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
      revision: 1381561,
      version: '132.0.6834.110',
      location: 'CfT',
      archivePath: 'mac-arm64',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-df453a3-locales-linux_x64.zip',
      archiveChecksum: '90c6adae9efdda89aeab9df58bce176e8fad137bb2e22bf6193fd6de766ff867',
      binaryChecksum: '7dd357acbad7f7ee29b33949ef0a63ac5a51a26c6474ae8762d18a337a315b78',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1381561,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-df453a3-locales-linux_arm64.zip',
      archiveChecksum: 'a13110193e746913c661ab6c07403b1aa5018cb1c8f0e7890da486a1fb2a413e',
      binaryChecksum: 'c03865b5afc998107281547178440d49a56b2de32e6ecfaaa3b1db8697229fa3',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1381561,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-win64.zip',
      archiveChecksum: '5b02a62e74f9a1f07d313e1b5e10f576b87417395853c16987b3fcbbf2b20437',
      binaryChecksum: '9942087a5fc4c6b1d51ec193e2e1de7166203570f95443f73194502fc7830a65',
      binaryRelativePath: path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      revision: 1381561,
      version: '132.0.6834.110',
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
