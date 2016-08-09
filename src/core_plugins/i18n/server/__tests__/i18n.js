import expect from 'expect.js';
import fs from 'fs';
import fse from 'fs-extra';
import i18n from '../i18n/i18n';
import path from 'path';
import process from 'child_process';
import Promise from 'bluebird';

const PATH_SEPARATOR = path.sep;
const DATA_PATH = __dirname + PATH_SEPARATOR + 'data';
const TRANSLATION_BACKUP_PATH = DATA_PATH + '/translations_backup';

const translationStorePath = i18n.getTranslationStoragePath();
const stat = Promise.promisify(fs.stat);

describe('Test registering translations for test_plugin_1', function () {
  const pluginName = 'test_plugin_1';
  const pluginTranslationPath = DATA_PATH + PATH_SEPARATOR + 'translations' + PATH_SEPARATOR + pluginName;

  before(function (done) {
    backupTranslations(done);
  });

  it('Register translations' , function (done) {
    let result = true;
    const translationFiles = [
      pluginTranslationPath + PATH_SEPARATOR + 'de.json',
      pluginTranslationPath + PATH_SEPARATOR + 'en.json'
    ];

    registerTranslations(translationFiles).then(() => {
      expect(result).to.be(true);
      done();
    }).catch(function (err) {
      console.log(err);
      result = false;
      expect(result).to.be(true);
      done();
    });

  });

  it('EN translations are registered' , function (done) {
    const locale = 'en';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR +
      'reference' + PATH_SEPARATOR + pluginName + PATH_SEPARATOR + locale +
      '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(locale, expectedTranslationJson, done);
  });

  it('DE translations are registered' , function (done) {
    const locale = 'de';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR +
      'reference' + PATH_SEPARATOR + pluginName + PATH_SEPARATOR + locale +
      '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(locale, expectedTranslationJson, done);
  });

  it('Translation locales are registered', function (done) {
    const expectedLocales = ['en', 'de'];
    checkRegisteredLocales(expectedLocales, done);
  });

  after(function (done) {
    restoreTranslations(done);
  });
});

describe('Test registering translations for test_plugin_1 and test_plugin_2', function () {

  before(function (done) {
    backupTranslations(done);
  });

  it('Register translations for test_plugin_1' , function (done) {
    let result = true;
    const pluginName = 'test_plugin_1';
    const pluginTranslationPath = DATA_PATH + PATH_SEPARATOR + 'translations' + PATH_SEPARATOR + pluginName;
    const translationFiles = [
      pluginTranslationPath + PATH_SEPARATOR + 'de.json',
      pluginTranslationPath + PATH_SEPARATOR + 'en.json'
    ];

    registerTranslations(translationFiles).then(() => {
      expect(result).to.be(true);
      done();
    }).catch(function (err) {
      console.log(err);
      result = false;
      expect(result).to.be(true);
      done();
    });
  });

  it('Register translations for test_plugin_2' , function (done) {
    let result = true;
    const pluginName = 'test_plugin_2';
    const pluginTranslationPath = DATA_PATH + PATH_SEPARATOR + 'translations' + PATH_SEPARATOR + pluginName;
    const translationFiles = [
      pluginTranslationPath + PATH_SEPARATOR + 'en.json'
    ];

    registerTranslations(translationFiles).then(() => {
      expect(result).to.be(true);
      done();
    }).catch(function (err) {
      console.log(err);
      result = false;
      expect(result).to.be(true);
      done();
    });
  });

  it('EN translations are registered' , function (done) {
    const locale = 'en';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR + 'reference' + PATH_SEPARATOR + locale + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(locale, expectedTranslationJson, done);
  });

  it('DE translations are registered' , function (done) {
    const locale = 'de';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR + 'reference' + PATH_SEPARATOR + locale + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(locale, expectedTranslationJson, done);
  });

  it('Translation locales are registered', function (done) {
    const expectedLocales = ['en', 'de'];
    checkRegisteredLocales(expectedLocales, done);
  });

  after(function (done) {
    restoreTranslations(done);
  });
});

function compareTranslations(actual, expected) {
  let equal = true;

  for (let key in expected) {
    if (!actual.hasOwnProperty(key)) {
      equal = false;
      break;
    }
    if (actual[key] !== expected[key]) {
      equal = false;
      break;
    }
  }

  return equal;
}

function checkTranslations(locale, expectedTranslations, done) {
  let result = true;

  i18n.getRegisteredLocaleTranslations(locale).then(function (actualTranslationJson) {
    if (!compareTranslations(actualTranslationJson, expectedTranslations)) {
      result = false;
    }
    expect(result).to.be(true);
    done();
  }).catch(function (err) {
    console.log(err);
    result = false;
    expect(result).to.be(true);
    done();
  });
}

function registerTranslations(pluginTranslationFiles) {
  return Promise.map(pluginTranslationFiles, (translationFile) => {
    return i18n.registerTranslations(translationFile).then(() => {
    });
  });
}

function checkRegisteredLocales(expectedLocales, done) {
  let result = true;

  i18n.getRegisteredTranslationLocales().then(function (actualLocales) {
    if (actualLocales.length !== expectedLocales.length) {
      result = false;
    } else {
      let index = actualLocales.length;
      actualLocales.sort();
      expectedLocales.sort();
      while (index--) {
        if (actualLocales[index] !== expectedLocales[index]) {
          result = false;
          break;
        }
      }
    }
    expect(result).to.be(true);
    done();
  }).catch(function (err) {
    console.log(err);
    result = false;
    expect(result).to.be(true);
    done();
  });
}

function backupTranslations(done) {
  const translationStorePath = i18n.getTranslationStoragePath();
  return stat(translationStorePath).then((stats) => {
    fse.copy(translationStorePath, TRANSLATION_BACKUP_PATH, function (err) {
      if (err) {
        console.error(err);
        done();
        return;
      }
      fse.emptyDir(translationStorePath, function (err) {
        if (err) {
          console.error(err);
        }
        done();
      });
    });
  }).catch(function (e) {
    done();
  });
}

function restoreTranslations(done) {
  const translationStorePath = i18n.getTranslationStoragePath();
  fse.emptyDir(translationStorePath, function (err) {
    if (err) {
      console.error(err);
      done();
      return;
    }
    return stat(TRANSLATION_BACKUP_PATH).then((stats) => {
      fse.copy(TRANSLATION_BACKUP_PATH, translationStorePath, function (err) {
        if (err) {
          console.error(err);
          done();
          return;
        }
        fse.remove(TRANSLATION_BACKUP_PATH, function (err) {
          if (err) {
            console.error(err);
          }
          done();
        });
      });
    }).catch(function (e) {
      done();
    });
  });
}
