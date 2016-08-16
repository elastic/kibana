import expect from 'expect.js';
import i18n from '../i18n/i18n';
import path from 'path';
import Promise from 'bluebird';

const PATH_SEPARATOR = path.sep;
const DATA_PATH = __dirname + PATH_SEPARATOR + 'data';

describe('Test registering translations for test_plugin_1', function () {
  const pluginName = 'test_plugin_1';
  const pluginTranslationPath = DATA_PATH + PATH_SEPARATOR + 'translations' + PATH_SEPARATOR + pluginName;

  it('Register translations' , function (done) {
    let result = true;
    const translationFiles = [
      pluginTranslationPath + PATH_SEPARATOR + 'de.json',
      pluginTranslationPath + PATH_SEPARATOR + 'en.json'
    ];

    registerTranslations(translationFiles);
    expect(result).to.be(true);
    done();
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

    registerTranslations(translationFiles);
    expect(result).to.be(true);
    done();
  });

  it('Register translations for test_plugin_2' , function (done) {
    let result = true;
    const pluginName = 'test_plugin_2';
    const pluginTranslationPath = DATA_PATH + PATH_SEPARATOR + 'translations' + PATH_SEPARATOR + pluginName;
    const translationFiles = [
      pluginTranslationPath + PATH_SEPARATOR + 'en.json'
    ];

    registerTranslations(translationFiles);
    expect(result).to.be(true);
    done();
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
  const numFiles = pluginTranslationFiles.length;
  for (let indx = 0; indx < numFiles; indx++) {
    i18n.registerTranslations(pluginTranslationFiles[indx]);
  }
}

function checkRegisteredLocales(expectedLocales, done) {
  let result = true;

  const actualLocales = i18n.getRegisteredTranslationLocales();
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
}
