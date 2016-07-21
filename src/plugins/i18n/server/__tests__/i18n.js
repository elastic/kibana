import expect from 'expect.js';
import i18n from '../i18n/i18n';
import path from 'path';
import process from 'child_process';
import Promise from 'bluebird';

const PATH_SEPARATOR = path.sep;
const DATA_PATH = __dirname + PATH_SEPARATOR + 'fixtures';

describe('Test registering translations for test_plugin_1', function () {
  const pluginName = 'test_plugin_1';
  const pluginTranslationPath = DATA_PATH + PATH_SEPARATOR + 'translations' + PATH_SEPARATOR + pluginName;

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
    const language = 'en';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR +
      'reference' + PATH_SEPARATOR + pluginName + PATH_SEPARATOR + language +
      '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(language, expectedTranslationJson, done);
  });

  it('DE translations are registered' , function (done) {
    const language = 'de';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR +
      'reference' + PATH_SEPARATOR + pluginName + PATH_SEPARATOR + language +
      '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(language, expectedTranslationJson, done);
  });

  it('Translation languages are registered', function (done) {
    const expectedLanguages = ['en', 'de'];
    checkRegisteredLanguages(expectedLanguages, done);
  });

  after(function (done) {
    const translationStorePath = i18n.getTranslationStoragePath();
    process.execSync('rm -rf ' + translationStorePath);
    done();
  });
});

describe('Test registering translations for test_plugin_1 and test_plugin_2', function () {
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
    const language = 'en';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR + 'reference' + PATH_SEPARATOR + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(language, expectedTranslationJson, done);
  });

  it('DE translations are registered' , function (done) {
    const language = 'de';
    const expectedTranslationJsonFile = DATA_PATH + PATH_SEPARATOR + 'reference' + PATH_SEPARATOR + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(language, expectedTranslationJson, done);
  });

  it('Translation languages are registered', function (done) {
    const expectedLanguages = ['en', 'de'];
    checkRegisteredLanguages(expectedLanguages, done);
  });

  after(function (done) {
    const translationStorePath = i18n.getTranslationStoragePath();
    process.execSync('rm -rf ' + translationStorePath);
    done();
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

function checkTranslations(language, expectedTranslations, done) {
  let result = true;

  i18n.getRegisteredLanguageTranslations(language).then(function (actualTranslationJson) {
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

function checkRegisteredLanguages(expectedLanguages, done) {
  let result = true;

  i18n.getRegisteredTranslationLanguages().then(function (actualLanguages) {
    if (actualLanguages.length !== expectedLanguages.length) {
      result = false;
    } else {
      let index = actualLanguages.length;
      actualLanguages.sort();
      expectedLanguages.sort();
      while (index--) {
        if (actualLanguages[index] !== expectedLanguages[index]) {
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
