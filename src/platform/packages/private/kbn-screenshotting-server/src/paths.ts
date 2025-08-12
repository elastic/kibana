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
      archiveChecksum: '62acfa4614ec5ca93500c360f20893bcdbb2d7404212e875ab36ec7a0582ea38',
      binaryChecksum: 'bf1acd0d06c4e74dd0d0efe02e427b97ef4fec04f824d4e34042b093ce2d941d',
      binaryRelativePath: 'chrome-headless-shell-mac-x64/chrome-headless-shell',
      version: '137.0.7151.70',
      location: 'chromeForTesting',
      archivePath: 'mac-x64',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-headless-shell-mac-arm64.zip',
      archiveChecksum: '0859f7f77b1770fff3c1d90a18c1e0b0ac4c3ad88b5c94594ceb13d867917044',
      binaryChecksum: 'bc273b92ea56f963e748bc50ce8f18a97a02fb19accff6081198818a2c49efdc',
      binaryRelativePath: 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
      version: '137.0.7151.70',
      location: 'chromeForTesting',
      archivePath: 'mac-arm64',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-dfa4dc5-locales-linux_x64.zip',
      archiveChecksum: 'de7ada038ba05427cde8c88a46ae8fc78f2234d210b32f47cd0be2fe00c49c07',
      binaryChecksum: 'adf965718b302c4b32fdca7946a1a98b14d8b300fb4ea522f9b82aa4d8a6b925',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-dfa4dc5-locales-linux_arm64.zip',
      archiveChecksum: '4fc2465cc0d0209120f11ffe02de87b9dcb33bae46352b007c3f9931de54d94e',
      binaryChecksum: '5a3a531e67726109afda41f67540131482b43856cb2f9d59d865ed5597627b4b',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-headless-shell-win64.zip',
      archiveChecksum: 'feb586eb8ee687cfa2da34be97896a8ab8442c16cd46b624234e1b9a9fc9a177',
      binaryChecksum: 'f0f58682cd343ab34693b60746e9cbdc2b5c4c323a678927dc5dccb8708b2849',
      binaryRelativePath: path.join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      version: '137.0.7151.70',
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
