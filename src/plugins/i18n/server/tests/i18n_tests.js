import expect from 'expect.js';

var process = require('child_process');
var i18n = require('../i18n');

describe('Test plugin translations details for test_plugin_1', function () {
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/data/translations/' + pluginName;

  it('Translation languages exist', function (done) {
    var result = true;
    var expectedLanguages = ['en', 'de'];
    getPluginTranslationLanguages(pluginName, pluginTranslationPath, function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (actualLanguages.length !== expectedLanguages.length) {
          result = false;
        } else {
          var index = actualLanguages.length;
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
    var result = true;
    var expectedFiles = [
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
          var index = actualFiles.length;
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
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/data/translations/' + pluginName;

  it('Register translations' , function (done) {
    var result = true;
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
    var result = true;
    var language = 'en';
    var expectedTranslationJsonFile = __dirname + '/data/reference/' + pluginName + '/' + language + '.json';
    var expectedTranslationJson = require(expectedTranslationJsonFile);

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
    var result = true;
    var language = 'de';
    var expectedTranslationJsonFile = __dirname + '/data/reference/' + pluginName + '/' + language + '.json';
    var expectedTranslationJson = require(expectedTranslationJsonFile);

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
    var expectedLanguages = ['en', 'de'];
    var result = true;

    i18n.getRegisteredTranslationLanguages(function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      }

      if (actualLanguages.length !== expectedLanguages.length) {
        result = false;
      } else {
        var index = actualLanguages.length;
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
    var translationStorePath = i18n.getTranslationStoragePath();
    process.execSync('rm -rf ' + translationStorePath);
    done();
  });
});

describe('Test registering translations for test_plugin_1 and test_plugin_2', function () {
  it('Register translations for test_plugin_1' , function (done) {
    var result = true;
    var pluginName = 'test_plugin_1';
    var pluginTranslationPath = __dirname + '/data/translations/' + pluginName;
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
    var result = true;
    var pluginName = 'test_plugin_2';
    var pluginTranslationPath = __dirname + '/data/translations/' + pluginName;
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
    var result = true;
    var language = 'en';
    var expectedTranslationJsonFile = __dirname + '/data/reference/' + language + '.json';
    var expectedTranslationJson = require(expectedTranslationJsonFile);

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
    var result = true;
    var language = 'de';
    var expectedTranslationJsonFile = __dirname + '/data/reference/' + language + '.json';
    var expectedTranslationJson = require(expectedTranslationJsonFile);

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
    var expectedLanguages = ['en', 'de'];
    var result = true;

    i18n.getRegisteredTranslationLanguages(function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      }

      if (actualLanguages.length !== expectedLanguages.length) {
        result = false;
      } else {
        var index = actualLanguages.length;
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
    var translationStorePath = i18n.getTranslationStoragePath();
    process.execSync('rm -rf ' + translationStorePath);
    done();
  });
});

function getPluginTranslationLanguages(pluginName, pluginTranslationPath, cb) {
  var translationFiles = [];
  var languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);
    return cb(null, languageList);
  });
}

function getPluginTranslationFiles(pluginName, pluginTranslationPath, cb) {
  var translationFiles = [];
  var languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);
    return cb(null, translationFiles);
  });
}

function compareTranslations(actual, expected) {
  var equal = true;

  for (var key in expected) {
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
