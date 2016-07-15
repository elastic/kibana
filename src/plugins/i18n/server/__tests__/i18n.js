import expect from 'expect.js';
import process from 'child_process';
import i18n from '../i18n/i18n';

const DATA_PATH = __dirname + '/fixtures';

describe('Test plugin translations details for test_plugin_1', function () {
  const pluginName = 'test_plugin_1';
  const pluginTranslationPath = DATA_PATH + '/translations/' + pluginName;

  it('Translation languages exist', function (done) {
    let result = true;
    const expectedLanguages = ['en', 'de'];
    let actualLanguages = [];
    getPluginTranslationLanguages(pluginTranslationPath, actualLanguages).then(function () {
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
    }).catch(function (e) {
      console.log(e);
      result = false;
      expect(result).to.be(true);
      done();
    });
  });

  it('Translation files exist', function (done) {
    let result = true;
    let actualFiles = [];
    const expectedFiles = [
      pluginTranslationPath + '/de.json',
      pluginTranslationPath + '/en.json'
    ];
    getPluginTranslationFiles(pluginTranslationPath, actualFiles).then(function () {
      if (actualFiles.length !== expectedFiles.length) {
        result = false;
      } else {
        let index = actualFiles.length;
        actualFiles.sort();
        expectedFiles.sort();
        while (index--) {
          if (actualFiles[index] !== expectedFiles[index]) {
            result = false;
            break;
          }
        }
      }
      expect(result).to.be(true);
      done();
    }).catch(function (e) {
      console.log(e);
      expect(result).to.be(true);
      done();
    });
  });
});

describe('Test registering translations for test_plugin_1', function () {
  const pluginName = 'test_plugin_1';
  const pluginTranslationPath = DATA_PATH + '/translations/' + pluginName;

  it('Register translations' , function (done) {
    registerTranslations(pluginTranslationPath, done);
  });

  it('EN translations are registered' , function (done) {
    const language = 'en';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + pluginName + '/' + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(language, expectedTranslationJson, done);
  });

  it('DE translations are registered' , function (done) {
    const language = 'de';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + pluginName + '/' + language + '.json';
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
    const pluginName = 'test_plugin_1';
    const pluginTranslationPath = DATA_PATH + '/translations/' + pluginName;
    registerTranslations(pluginTranslationPath, done);
  });

  it('Register translations for test_plugin_2' , function (done) {
    const pluginName = 'test_plugin_2';
    const pluginTranslationPath = DATA_PATH + '/translations/' + pluginName;
    registerTranslations(pluginTranslationPath, done);
  });

  it('EN translations are registered' , function (done) {
    const language = 'en';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);
    checkTranslations(language, expectedTranslationJson, done);
  });

  it('DE translations are registered' , function (done) {
    const language = 'de';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + language + '.json';
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

function getPluginTranslationLanguages(pluginTranslationPath, languageList) {
  let translationFiles = [];
  return i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList);
}

function getPluginTranslationFiles(pluginTranslationPath, translationFiles) {
  let languageList = [];
  return i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList);
}

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

function registerTranslations(pluginTranslationPath, done) {
  let result = true;

  i18n.registerTranslations(pluginTranslationPath).then(function () {
    expect(result).to.be(true);
    done();
  }).catch(function (err) {
    console.log(err);
    result = false;
    expect(result).to.be(true);
    done();
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
