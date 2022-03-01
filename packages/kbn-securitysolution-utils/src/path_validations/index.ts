/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const FILENAME_WILDCARD_WARNING = i18n.translate('utils.filename.wildcardWarning', {
  defaultMessage: `A wildcard in the filename will affect the endpoint's performance`,
});

export const FILEPATH_WARNING = i18n.translate('utils.filename.pathWarning', {
  defaultMessage: `Path may be formed incorrectly; verify value`,
});

export const enum ConditionEntryField {
  HASH = 'process.hash.*',
  PATH = 'process.executable.caseless',
  SIGNER = 'process.Ext.code_signature',
}

export const enum OperatingSystem {
  LINUX = 'linux',
  MAC = 'macos',
  WINDOWS = 'windows',
}

export type TrustedAppEntryTypes = 'match' | 'wildcard';
/*
 * regex to match executable names
 * starts matching from the eol of the path
 * file names with a single or multiple spaces (for spaced names)
 * and hyphens and combinations of these that produce complex names
 * such as:
 * c:\home\lib\dmp.dmp
 * c:\home\lib\my-binary-app-+/ some/  x/ dmp.dmp
 * /home/lib/dmp.dmp
 * /home/lib/my-binary-app+-\ some\  x\ dmp.dmp
 */
export const WIN_EXEC_PATH = /(\\[-\w]+|\\[-\w]+[\.]+[\w]+)$/i;
export const UNIX_EXEC_PATH = /(\/[-\w]+|\/[-\w]+[\.]+[\w]+)$/i;

export const validateFilePathInput = ({
  os,
  value = '',
}: {
  os: OperatingSystem;
  value?: string;
}): string | undefined => {
  const textInput = value.trim();
  const isValidFilePath = isPathValid({
    os,
    field: 'file.path.text',
    type: 'wildcard',
    value: textInput,
  });
  const hasSimpleFileName = hasSimpleExecutableName({
    os,
    type: 'wildcard',
    value: textInput,
  });

  if (!textInput.length) {
    return FILEPATH_WARNING;
  }

  if (isValidFilePath) {
    if (!hasSimpleFileName) {
      return FILENAME_WILDCARD_WARNING;
    }
  } else {
    return FILEPATH_WARNING;
  }
};

export const hasSimpleExecutableName = ({
  os,
  type,
  value,
}: {
  os: OperatingSystem;
  type: TrustedAppEntryTypes;
  value: string;
}): boolean => {
  if (type === 'wildcard') {
    return os === OperatingSystem.WINDOWS ? WIN_EXEC_PATH.test(value) : UNIX_EXEC_PATH.test(value);
  }
  return true;
};

export const isPathValid = ({
  os,
  field,
  type,
  value,
}: {
  os: OperatingSystem;
  field: ConditionEntryField | 'file.path.text';
  type: TrustedAppEntryTypes;
  value: string;
}): boolean => {
  if (field === ConditionEntryField.PATH || field === 'file.path.text') {
    if (type === 'wildcard') {
      return os === OperatingSystem.WINDOWS
        ? isWindowsWildcardPathValid(value)
        : isLinuxMacWildcardPathValid(value);
    }
    return doesPathMatchRegex({ value, os });
  }
  return true;
};

const doesPathMatchRegex = ({ os, value }: { os: OperatingSystem; value: string }): boolean => {
  if (os === OperatingSystem.WINDOWS) {
    const filePathRegex =
      /^[a-z]:(?:|\\\\[^<>:"'/\\|?*]+\\[^<>:"'/\\|?*]+|%\w+%|)[\\](?:[^<>:"'/\\|?*]+[\\/])*([^<>:"'/\\|?*])+$/i;
    return filePathRegex.test(value);
  }
  return /^(\/|(\/[\w\-]+)+|\/[\w\-]+\.[\w]+|(\/[\w-]+)+\/[\w\-]+\.[\w]+)$/i.test(value);
};

const isWindowsWildcardPathValid = (path: string): boolean => {
  const firstCharacter = path[0];
  const lastCharacter = path.slice(-1);
  const trimmedValue = path.trim();
  const hasSlash = /\//.test(trimmedValue);
  if (path.length === 0) {
    return false;
  } else if (
    hasSlash ||
    trimmedValue.length !== path.length ||
    firstCharacter === '^' ||
    lastCharacter === '\\' ||
    !hasWildcard({ path, isWindowsPath: true })
  ) {
    return false;
  } else {
    return true;
  }
};

const isLinuxMacWildcardPathValid = (path: string): boolean => {
  const firstCharacter = path[0];
  const lastCharacter = path.slice(-1);
  const trimmedValue = path.trim();
  if (path.length === 0) {
    return false;
  } else if (
    trimmedValue.length !== path.length ||
    firstCharacter !== '/' ||
    lastCharacter === '/' ||
    path.length > 1024 === true ||
    path.includes('//') === true ||
    !hasWildcard({ path, isWindowsPath: false })
  ) {
    return false;
  } else {
    return true;
  }
};

const hasWildcard = ({
  path,
  isWindowsPath,
}: {
  path: string;
  isWindowsPath: boolean;
}): boolean => {
  for (const pathComponent of path.split(isWindowsPath ? '\\' : '/')) {
    if (/[\*|\?]+/.test(pathComponent) === true) {
      return true;
    }
  }
  return false;
};
