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
      archiveFilename: 'chromium-fe621c5-locales-linux_x64.zip',
      archiveChecksum: '12ce2e0eac184072dfcbc7a267328e3eb7fbe10a682997f4111c0378f2397341',
      binaryChecksum: '670481cfa8db209401106cd23051009d390c03608724d0822a12c8c0a92b4c25',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1331488,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-fe621c5-locales-linux_arm64.zip',
      archiveChecksum: 'f7333eaff5235046c8775f0c1a0b7395b7ebc2e054ea638710cf511c4b6f9daf',
      binaryChecksum: '8a3a3371b3d04f4b0880b137a3611c223e0d8e65a218943cb7be1ec4a91f5e35',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1331488,
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
