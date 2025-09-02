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
      archiveChecksum: 'cf33dbfc571b0d7c676c7b3983b707683ee9259e89d6af904634f66b64d2ccef',
      binaryChecksum: '7ec8be87e56be88ec6443fea1de37dfc710e3a9827c9203903f77a6610c327ab',
      binaryRelativePath: 'chrome-headless-shell-mac-x64/chrome-headless-shell',
      version: '138.0.7204.157',
      location: 'chromeForTesting',
      archivePath: 'mac-x64',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-headless-shell-mac-arm64.zip',
      archiveChecksum: '25393b24823a683401dcce0c05d8dc3c349a5f602f24b919d379e6e5cc9a00e5',
      binaryChecksum: 'd8a2f47e238844717d9a7c301c1999ea7a83f7429607bf24f8faebb81b3e4d67',
      binaryRelativePath: 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
      version: '138.0.7204.157',
      location: 'chromeForTesting',
      archivePath: 'mac-arm64',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-e533e98-locales-linux_x64.zip',
      archiveChecksum: '8001c271c5a896d2d0c161e2fa9f1b51eab81b23c0e6c0dd3d4438ec52ff3ddd',
      binaryChecksum: '152f6366cb610f761692021dd0e17899d68e5eb593299954d61929b3eb13522d',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-e533e98-locales-linux_arm64.zip',
      archiveChecksum: '3ec667b4cc18925d526d16e5c77bc2832ce677880c19aae38f97b5c472b2fd99',
      binaryChecksum: '2be1b322a7039b9994e2c738c0f393a8933e12f3a36a642781f4d8d8f6df282b',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-win64.zip',
      archiveChecksum: '81773bdb0e203def02a0da0cc2763806c4ba6dba6b3f5f58ae31a477b86ef2eb',
      binaryChecksum: '6998c46bacc877c5400730e61a9a8b8f0074517359072aad9ec435be7d9e001c',
      binaryRelativePath: path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      version: '138.0.7204.157',
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
