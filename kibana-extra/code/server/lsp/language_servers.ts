/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JavaLauncher } from './java_launcher';
import { LauncherConstructor } from './language_server_launcher';
import { TypescriptServerLauncher } from './ts_launcher';

export enum InstallationType {
  Embed,
  Download,
}

export interface LanguageServerDefinition {
  name: string;
  builtinWorkspaceFolders: boolean;
  languages: string[];
  launcher: LauncherConstructor;
  installationType: InstallationType;
  version?: string;
  build?: string;
  installationFolderName?: string;
  downloadUrl?: (lang: LanguageServerDefinition) => string | string;
}

const typescript: LanguageServerDefinition = {
  name: 'Typescript',
  builtinWorkspaceFolders: false,
  languages: ['typescript', 'javascript', 'html'],
  launcher: TypescriptServerLauncher,
  installationType: InstallationType.Embed,
};
const java: LanguageServerDefinition = {
  name: 'Java',
  builtinWorkspaceFolders: true,
  languages: ['java'],
  launcher: JavaLauncher,
  installationType: InstallationType.Download,
  installationFolderName: 'jdt',
  version: '1.0.0-SNAPSHOT',
  build: '201812040656',
  downloadUrl: (lang: LanguageServerDefinition) =>
    `https://github.com/Poytr1/eclipse.jdt.ls/releases/download/v${
      lang.version
    }/jdt-language-server-${lang.version}-${lang.build}.tar.gz`,
};
export const LanguageServers: LanguageServerDefinition[] = [typescript, java];
