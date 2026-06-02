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
      archiveChecksum: '41a9f54be448f899a65fe2334228b3557ceb0989c523aa4bb4ef63e200d9af42',
      binaryChecksum: '899bc49bcc01c7e65510f47302eb5d21adbfa8e62704da4b044d31ce8b89e991',
      binaryRelativePath: 'chrome-headless-shell-mac-x64/chrome-headless-shell',
      version: '149.0.7827.22',
      location: 'chromeForTesting',
      archivePath: 'mac-x64',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-headless-shell-mac-arm64.zip',
      archiveChecksum: '2cdb852db2163fd877a27568f480075f2c3894e5fa05220d38aa2d889276cfb1',
      binaryChecksum: 'ee71cc78e8b0f42b9fbcdce26d26af8a53da46d0cb5250e40920a65e8ae6e390',
      binaryRelativePath: 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
      version: '149.0.7827.22',
      location: 'chromeForTesting',
      archivePath: 'mac-arm64',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-b4f28b5-locales-linux_x64.zip',
      archiveChecksum: '6a0294136c82f0f2971365c2776f947b43df6dce615db6f575967cdbf83507cf',
      binaryChecksum: '89a50cadb6d9b1ca9c7271e2f5d4d3d4307a80f1105a35a1b780247ab0e285ed',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-b4f28b5-locales-linux_arm64.zip',
      archiveChecksum: 'dc107faa3d186fae21fc4fb301af6eeeb00368a7e6afe24cfd4ee7a5652f3e73',
      binaryChecksum: 'c03865b5afc998107281547178440d49a56b2de32e6ecfaaa3b1db8697229fa3',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-win64.zip',
      archiveChecksum: 'f11c872c636c507f43fa7ad2f05a69995d5a69b50a3e3bb3e6a96c7264c30641',
      binaryChecksum: '7957b2409333206be5f07365667c20cb18007c49aec93a4842dee6a4de6d5caa',
      binaryRelativePath: path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      version: '149.0.7827.22',
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
