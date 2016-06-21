import expect from 'expect.js';

var process = require('child_process');
var i18n = require('../i18n');

describe('Test plugin translations details for test_plugin_1', function () {
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

  it('2 translation languages exist', function () {
    var result = true;
    var expectedLanguages = ['en', 'de'];
    var actualLanguages = getPluginTranslationLanguages(pluginName, pluginTranslationPath);
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
  });

  it('2 translation languages exist and wrongly expecting 1', function () {
    var result = true;
    var expectedLanguages = ['de'];
    var actualLanguages = getPluginTranslationLanguages(pluginName, pluginTranslationPath);
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
    expect(result).to.be(false);
  });
  it('Translation files exist', function () {
    var result = true;
    var expectedFiles = [
      pluginTranslationPath + '/view1/de.json',
      pluginTranslationPath + '/view1/en.json',
      pluginTranslationPath + '/view2/en.json'
    ];
    var actualFiles = getPluginTranslationFiles(pluginName, pluginTranslationPath);
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
    expect(result).to.be(true);
  });
});

describe('Test storing translations for test_plugin_1', function () {
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

  it('Translation plugin bundle for English' , function () {
    var result = true;
    var language = 'en';

    if (!i18n.storePluginLanguageTranslations(pluginName, pluginTranslationPath, language)) {
      result = false;
    } else {
      var expectedTranslationJsonFile = __dirname + '/data/reference/' + pluginName + '/' + language + '.json';
      var expectedTranslationJson = require(expectedTranslationJsonFile);
      expectedTranslationJson = JSON.stringify(expectedTranslationJson);
      var actualTranslationJson = i18n.getPluginLanguageTranslation(pluginName, language);
      actualTranslationJson = JSON.stringify(actualTranslationJson);
      if (actualTranslationJson !== expectedTranslationJson) {
        result = false;
      }
    }
    expect(result).to.be(true);
  });

  afterEach(function (done) {
    var translationPluginStorePath = i18n.getPluginTranslationStoragePath('test_plugin_1');
    process.exec('rm -rf ' + translationPluginStorePath, function (err,stdout,stderr) {
      if (err) throw err;
      done();
    });
  });
});

function getPluginTranslationLanguages(pluginName, pluginTranslationPath) {
  var translationFiles = [];
  var languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList);
  return languageList;
}

function getPluginTranslationFiles(pluginName, pluginTranslationPath) {
  var translationFiles = [];
  var languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList);
  return translationFiles;
}
