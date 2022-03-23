/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  isPathValid,
  hasSimpleExecutableName,
  OperatingSystem,
  ConditionEntryField,
  validateFilePathInput,
  FILENAME_WILDCARD_WARNING,
  FILEPATH_WARNING,
} from '.';

describe('validateFilePathInput', () => {
  describe('windows', () => {
    const os = OperatingSystem.WINDOWS;

    it('warns on wildcard in file name at the end of the path', () => {
      expect(validateFilePathInput({ os, value: 'c:\\path*.exe' })).toEqual(
        FILENAME_WILDCARD_WARNING
      );
    });

    it('warns on unix paths or non-windows paths', () => {
      expect(validateFilePathInput({ os, value: '/opt/bin' })).toEqual(FILEPATH_WARNING);
    });

    it('warns on malformed paths', () => {
      expect(validateFilePathInput({ os, value: 'c:\\path/opt' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: '1242' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: 'w12efdfa' })).toEqual(FILEPATH_WARNING);
    });
  });
  describe('unix paths', () => {
    const os =
      parseInt((Math.random() * 2).toString(), 10) === 1
        ? OperatingSystem.MAC
        : OperatingSystem.LINUX;

    it('warns on wildcard in file name at the end of the path', () => {
      expect(validateFilePathInput({ os, value: '/opt/bin*' })).toEqual(FILENAME_WILDCARD_WARNING);
    });

    it('warns on windows paths', () => {
      expect(validateFilePathInput({ os, value: 'd:\\path\\file.exe' })).toEqual(FILEPATH_WARNING);
    });

    it('warns on malformed paths', () => {
      expect(validateFilePathInput({ os, value: 'opt/bin\\file.exe' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: '1242' })).toEqual(FILEPATH_WARNING);
      expect(validateFilePathInput({ os, value: 'w12efdfa' })).toEqual(FILEPATH_WARNING);
    });
  });
});

describe('No Warnings', () => {
  it('should not show warnings on non path entries ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.HASH,
        type: 'match',
        value: '5d5b09f6dcb2d53a5fffc60c4ac0d55fabdf556069d6631545f42aa6e3500f2e',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.SIGNER,
        type: 'match',
        value: '',
      })
    ).toEqual(true);
  });
});

describe('Unacceptable Windows wildcard paths', () => {
  it('should not accept paths that do not have a folder name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\folder',
      })
    ).toEqual(false);
  });

  it('should not accept paths that do not have a file name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept nested paths that do not have a wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths with * wildcard and /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:/**/path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths with ? wildcard and /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:/?indows/pat?',
      })
    ).toEqual(false);
  });
});

describe('Acceptable Windows wildcard paths', () => {
  it('should accept wildcards for folders', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(true);
  });

  it('should accept wildcards for folders and files', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'e:\\**\\*.exe',
      })
    ).toEqual(true);
  });

  it('should accept paths with single wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'f:\\*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'f:\\?',
      })
    ).toEqual(true);
  });

  it('should accept paths that have wildcard in filenames', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'a:\\*.*',
      })
    ).toEqual(true);
  });

  it('should accept paths with ? as wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\?indows\\pat?',
      })
    ).toEqual(true);
  });

  it('should accept paths with both ? and * as wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\*?',
      })
    ).toEqual(true);
  });

  it('should accept paths with multiple wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\**',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\??',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Windows exact paths', () => {
  it('should accept paths when it ends with a folder name', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a file name', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\path.exe',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a filename in a folder', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Windows exact paths with hyphens', () => {
  it('should accept paths when paths have folder names with hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\hype-folder-name',
      })
    ).toEqual(true);
  });

  it('should accept paths when file names have hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\file-name.exe',
      })
    ).toEqual(true);
  });
});

describe('Unacceptable Windows exact paths', () => {
  it('should not accept paths with /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:/folder/path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths not having a <char:> in the suffix', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '\\folder\\path.exe',
      })
    ).toEqual(false);
  });
});

///
describe('Unacceptable Mac/Linux wildcard paths', () => {
  it('should not accept paths that do not have a folder name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/folder',
      })
    ).toEqual(false);
  });

  it('should not accept paths that do not have a file name with a wildcard ', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/zip.zip',
      })
    ).toEqual(false);
  });

  it('should not accept nested paths that do not have a wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/pack.tar',
      })
    ).toEqual(false);
  });

  it('should not accept paths with * wildcard and \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths with ? wildcard and \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\?indows\\pat?',
      })
    ).toEqual(false);
  });
});

describe('Acceptable Mac/Linux wildcard paths', () => {
  it('should accept wildcards for folders', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/**/file.',
      })
    ).toEqual(true);
  });

  it('should accept wildcards for folders and files', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/bi?/*.js',
      })
    ).toEqual(true);
  });

  it('should accept paths with single wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/op*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/op?',
      })
    ).toEqual(true);
  });

  it('should accept paths that have wildcard in filenames', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/*.*',
      })
    ).toEqual(true);
  });

  it('should accept paths with ? as wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/?inux/pat?',
      })
    ).toEqual(true);
  });

  it('should accept paths with both ? and * as wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/*?',
      })
    ).toEqual(true);
  });

  it('should accept paths with multiple wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/usr/**',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/??',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Mac/Linux exact paths', () => {
  it('should accept paths when it is the root path', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a file name', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/usr/file.ts',
      })
    ).toEqual(true);
  });

  it('should accept paths when it ends with a filename in a folder', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/opt/z.dmg',
      })
    ).toEqual(true);
  });
});

describe('Acceptable Mac/Linux exact paths with hyphens', () => {
  it('should accept paths when paths have folder names with hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/hype-folder-name',
      })
    ).toEqual(true);
  });

  it('should accept paths when file names have hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/file-name.dmg',
      })
    ).toEqual(true);
  });
});

describe('Unacceptable Mac/Linux exact paths', () => {
  it('should not accept paths with \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(false);
  });

  it('should not accept paths not starting with /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'opt/bin',
      })
    ).toEqual(false);
  });

  it('should not accept paths ending with /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/opt/bin/',
      })
    ).toEqual(false);
  });

  it('should not accept file extensions with hyphens', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/opt/bin/file.d-mg',
      })
    ).toEqual(false);
  });
});

describe('Executable filenames with wildcard PATHS', () => {
  it('should return TRUE when MAC/LINUX wildcard paths have an executable name', () => {
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.LINUX,
        type: 'wildcard',
        value: '/opt/*/app',
      })
    ).toEqual(true);
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.MAC,
        type: 'wildcard',
        value: '/op*/**/app.dmg',
      })
    ).toEqual(true);
  });

  it('should return TRUE when WINDOWS wildcards paths have a executable name', () => {
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.WINDOWS,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(true);
  });

  it('should return FALSE when MAC/LINUX wildcard paths have a wildcard in executable name', () => {
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.LINUX,
        type: 'wildcard',
        value: '/op/*/*pp',
      })
    ).toEqual(false);
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.MAC,
        type: 'wildcard',
        value: '/op*/b**/ap.m**',
      })
    ).toEqual(false);
  });
  it('should return FALSE when WINDOWS wildcards paths have a wildcard in executable name', () => {
    expect(
      hasSimpleExecutableName({
        os: OperatingSystem.WINDOWS,
        type: 'wildcard',
        value: 'c:\\**\\pa*h.exe',
      })
    ).toEqual(false);
  });
});
