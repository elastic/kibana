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
    getPluginTranslationLanguages(pluginName, pluginTranslationPath, function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      } else {
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
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Translation files exist', function (done) {
    let result = true;
    const expectedFiles = [
      pluginTranslationPath + '/view1/de.json',
      pluginTranslationPath + '/view1/en.json',
      pluginTranslationPath + '/view2/en.json'
    ];
    getPluginTranslationFiles(pluginName, pluginTranslationPath, function (err, actualFiles) {
      if (err) {
        console.log(err);
        result = false;
      } else {
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
      }
      expect(result).to.be(true);
      done();
    });
  });
});

describe('Test registering translations for test_plugin_1', function () {
  const pluginName = 'test_plugin_1';
  const pluginTranslationPath = DATA_PATH + '/translations/' + pluginName;

  it('Register translations' , function (done) {
    let result = true;
    i18n.registerTranslations(pluginTranslationPath, function (err) {
      if (err) {
        console.log(err);
        result = false;
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('EN translations are registered' , function (done) {
    let result = true;
    const language = 'en';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + pluginName + '/' + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);

    i18n.getRegisteredLanguageTranslations(language, function (err, actualTranslationJson) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (!compareTranslations(actualTranslationJson, expectedTranslationJson)) {
          result = false;
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('DE translations are registered' , function (done) {
    let result = true;
    const language = 'de';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + pluginName + '/' + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);

    i18n.getRegisteredLanguageTranslations(language, function (err, actualTranslationJson) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (!compareTranslations(actualTranslationJson, expectedTranslationJson)) {
          result = false;
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Translation languages are registered', function (done) {
    const expectedLanguages = ['en', 'de'];
    let result = true;

    i18n.getRegisteredTranslationLanguages(function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      }

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
    });
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
    const pluginTranslationPath = DATA_PATH + '/translations/' + pluginName;
    i18n.registerTranslations(pluginTranslationPath, function (err) {
      if (err) {
        console.log(err);
        result = false;
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Register translations for test_plugin_2' , function (done) {
    let result = true;
    const pluginName = 'test_plugin_2';
    const pluginTranslationPath = DATA_PATH + '/translations/' + pluginName;
    i18n.registerTranslations(pluginTranslationPath, function (err) {
      if (err) {
        console.log(err);
        result = false;
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('EN translations are registered' , function (done) {
    let result = true;
    const language = 'en';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);

    i18n.getRegisteredLanguageTranslations(language, function (err, actualTranslationJson) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (!compareTranslations(actualTranslationJson, expectedTranslationJson)) {
          result = false;
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('DE translations are registered' , function (done) {
    let result = true;
    const language = 'de';
    const expectedTranslationJsonFile = DATA_PATH + '/reference/' + language + '.json';
    const expectedTranslationJson = require(expectedTranslationJsonFile);

    i18n.getRegisteredLanguageTranslations(language, function (err, actualTranslationJson) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (!compareTranslations(actualTranslationJson, expectedTranslationJson)) {
          result = false;
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Translation languages are registered', function (done) {
    const expectedLanguages = ['en', 'de'];
    let result = true;

    i18n.getRegisteredTranslationLanguages(function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      }

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
    });
  });

  after(function (done) {
    const translationStorePath = i18n.getTranslationStoragePath();
    process.execSync('rm -rf ' + translationStorePath);
    done();
  });
});

function getPluginTranslationLanguages(pluginName, pluginTranslationPath, cb) {
  let translationFiles = [];
  let languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);
    return cb(null, languageList);
  });
}

function getPluginTranslationFiles(pluginName, pluginTranslationPath, cb) {
  let translationFiles = [];
  let languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);
    return cb(null, translationFiles);
  });
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
