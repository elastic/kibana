import expect from 'expect.js';

var process = require('child_process');
var i18n = require('../i18n');

describe('Test plugin translations details for test_plugin_1', function () {
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

  it('2 translation languages exist', function (done) {
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

  it('2 translation languages exist and wrongly expecting 1', function (done) {
    var result = true;
    var expectedLanguages = ['de'];
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
      expect(result).to.be(false);
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

describe('Test storing translations for test_plugin_1', function () {
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

  it('Translation plugin bundle for English' , function (done) {
    var result = true;
    var language = 'en';

    i18n.storePluginLanguageTranslations(pluginName, pluginTranslationPath, language, function (err) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        var expectedTranslationJsonFile = __dirname + '/data/reference/' + pluginName + '/' + language + '.json';
        var expectedTranslationJson = require(expectedTranslationJsonFile);
        expectedTranslationJson = JSON.stringify(expectedTranslationJson);
        i18n.getPluginLanguageTranslation(pluginName, language, function (err, actualTranslationJson) {
          if (err) {
            console.log(err);
            result = false;
          } else {
            actualTranslationJson = JSON.stringify(actualTranslationJson);
            if (actualTranslationJson !== expectedTranslationJson) {
              result = false;
            }
          }
        });
      }
      expect(result).to.be(true);
      done();
    });
  });

  afterEach(function (done) {
    var translationPluginStorePath = i18n.getPluginTranslationStoragePath('test_plugin_1');
    process.execSync('rm -rf ' + translationPluginStorePath);
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
