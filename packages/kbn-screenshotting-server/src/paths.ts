/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  location: 'custom' | 'common';
  revision: number;
}

enum BaseUrl {
  // see https://www.chromium.org/getting-involved/download-chromium
  common = 'https://commondatastorage.googleapis.com/chromium-browser-snapshots',
  // A GCS bucket under the Kibana team
  custom = 'https://storage.googleapis.com/headless_shell',
}

interface CustomPackageInfo extends PackageInfo {
  location: 'custom';
}
interface CommonPackageInfo extends PackageInfo {
  location: 'common';
  archivePath: string;
}

function isCommonPackage(p: PackageInfo): p is CommonPackageInfo {
  return p.location === 'common';
}

export class ChromiumArchivePaths {
  public readonly packages: Array<CustomPackageInfo | CommonPackageInfo> = [
    {
      platform: 'darwin',
      architecture: 'x64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: 'f69bb2f5f402aa2bdd28ccab3a9b36857d1591a1f443fa5b8865df644805cb96',
      binaryChecksum: 'c6289a1a1d45021b2259ea0c9ae65ea37199452b5457831680a5e192a3f19add',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1274550,
      location: 'common',
      archivePath: 'Mac',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: '55d8cfe56d4461645a663de263ae670f78cc69b69aee16a62c47f361fa9a62f2',
      binaryChecksum: 'e5d4ccdbf3b66532c7c0973be2d5bbd3189079646ced55fe4db61d8e7e7bfc7e',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1274557, // 1274542 is not available for Mac_Arm
      location: 'common',
      archivePath: 'Mac_Arm',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-46cf136-locales-linux_x64.zip',
      archiveChecksum: '8ea5f2d72352230f7927725a6ffd6d5fb462a0c8ad76e320003748b62df6d221',
      binaryChecksum: 'e7f8109ef7535dab500166b335524dfa4e92324fa31a2a61f510a5fa5afc2eee',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1274542,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-46cf136-locales-linux_arm64.zip',
      archiveChecksum: '7d01fe8a78a019cf714c913d37353f85d54c4c7d4fde91d6c96605d259a66414',
      binaryChecksum: 'd1a8b8708dc5ced8a9c526a0d823a4074325573f9c06fabe14e18fd3a36691c9',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1274542,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: 'd5e9691fb9d378ae13c8956be0d9eb45674d033e8b38125ace2f2fdd458e5ca0',
      binaryChecksum: '4d8f95e4f218fc3010ab2f0d8f8674f16d554622218e73f9a7c8a22dbba2e078',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      revision: 1274557,
      location: 'common',
      archivePath: 'Win',
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
    if (isCommonPackage(p)) {
      const { common } = BaseUrl;
      const { archivePath, revision, archiveFilename } = p;
      return `${common}/${archivePath}/${revision}/${archiveFilename}`;
    }
    return BaseUrl.custom + '/' + p.archiveFilename; // revision is not used for URL if package is a custom build
  }

  public getBinaryPath(p: PackageInfo, chromiumPath: string) {
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
