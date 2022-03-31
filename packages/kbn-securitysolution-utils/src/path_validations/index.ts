/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const FILENAME_WILDCARD_WARNING = i18n.translate('utils.filename.wildcardWarning', {
  defaultMessage: `Using wildcards in file paths can impact Endpoint performance`,
});

export const FILEPATH_WARNING = i18n.translate('utils.filename.pathWarning', {
  defaultMessage: `Path may be formed incorrectly; verify value`,
});

export const enum ConditionEntryField {
  HASH = 'process.hash.*',
  PATH = 'process.executable.caseless',
  SIGNER = 'process.Ext.code_signature',
}

export const enum EntryFieldType {
  HASH = '.hash.',
  EXECUTABLE = '.executable.caseless',
  PATH = '.path',
  SIGNER = '.Ext.code_signature',
}

export type TrustedAppConditionEntryField =
  | 'process.hash.*'
  | 'process.executable.caseless'
  | 'process.Ext.code_signature';
export type BlocklistConditionEntryField = 'file.hash.*' | 'file.path' | 'file.Ext.code_signature';
export type AllConditionEntryFields = TrustedAppConditionEntryField | BlocklistConditionEntryField;

export const enum OperatingSystem {
  LINUX = 'linux',
  MAC = 'macos',
  WINDOWS = 'windows',
}

export type EntryTypes = 'match' | 'wildcard' | 'match_any';
export type TrustedAppEntryTypes = Extract<EntryTypes, 'match' | 'wildcard'>;

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
    if (hasSimpleFileName !== undefined && !hasSimpleFileName) {
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
  type: EntryTypes;
  value: string;
}): boolean | undefined => {
  const separator = os === OperatingSystem.WINDOWS ? '\\' : '/';
  const lastString = value.split(separator).pop();
  if (!lastString) {
    return;
  }
  if (type === 'wildcard') {
    return (lastString.split('*').length || lastString.split('?').length) === 1;
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
  field: AllConditionEntryFields | 'file.path.text';
  type: EntryTypes;
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
