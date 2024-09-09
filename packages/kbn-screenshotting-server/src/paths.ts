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
      archiveChecksum: '0a3d18efd00b3406f66139a673616b4b2b4b00323776678cb82295996f5a6733',
      binaryChecksum: '8bcdaa973ee11110f6b70eaac2418fda3bb64446cf37f964fce331cdc8907a20',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1331485, // 1331488 is not available for Mac_x64
      location: 'common',
      archivePath: 'Mac',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: '426eddf16acb88b9446a91de53cc4364c7d487414248f33e30f68cf488cea0c0',
      binaryChecksum: '827931739bfdd2b6790a81d5ade8886c159cd051581d79b84d1ede447293e9cf',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1331488,
      location: 'common',
      archivePath: 'Mac_Arm',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-5b5d829-locales-linux_x64.zip',
      archiveChecksum: '799e8fd5f47ea70b8a3972d39b2617c9cbebc7fc433a89251dae312a7c77534b',
      binaryChecksum: '216b8f7ff9b41e985397342c2df54e4f8e07a01a3b8a929f39b9a10931d26ff5',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1300313,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-5b5d829-locales-linux_arm64.zip',
      archiveChecksum: '961e20c45c61f8e948efdc4128bb17c23217bbcb28537f270ccf5bf0826981e7',
      binaryChecksum: 'fc4027fb6b1c96bef9374d5d9f791097fae2ec2ddc4e0134167075bd52d1458f',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1300313,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: 'fa62be702f55f37e455bab4291c59ceb40e81e1922d30cf9453a4ee176b909bc',
      binaryChecksum: '1345e66583bad1a1f16885f381d1173de8bf931487da9ba155e1b58bf23b2c66',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      revision: 1331487, // 1331488 is not available for win32
      location: 'common',
      archivePath: 'Win',
      isPreInstalled: true,
    },
  ];

  // zip files get downloaded to a .chromium directory in the kibana root
  public readonly archivesPath = path.resolve(__dirname, '../../../.chromium');

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
