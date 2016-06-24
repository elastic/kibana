var fs = require('fs');
var path = require('path');
var process = require('child_process');
var os = require('os');
var kibanaPackage = require('../../../utils/package_json');

const TRANSLATION_FILE_EXTENSION = 'json';
const TRANSLATION_STORE_PATH = kibanaPackage.__dirname + '/data/store_translations';

module.exports = {
  storePluginLanguageTranslations: function (pluginName, pluginTranslationPath, language, cb) {
    var translationFiles = [];
    var languageList = [];
    var translationStorePluginPath = module.exports.getPluginTranslationStoragePath(pluginName);
    var translationFileName = language + '.' + TRANSLATION_FILE_EXTENSION;

    module.exports.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
      var langSupported = false;
      for (var langIndx in languageList) {
        if (language === languageList[langIndx]) {
          langSupported = true;
          break;
        }
      }
      if (langSupported) {
        if (!fs.existsSync(translationStorePluginPath)) {
          createDirectoriesRecursively(translationStorePluginPath);
        }
        for (var fileIndx in translationFiles) {
          if (!translationFiles.hasOwnProperty(fileIndx)) continue;
          var translationFile = translationFiles[fileIndx];
          var pluginTranslationFileName = getFileName(translationFile);
          if (pluginTranslationFileName !== translationFileName) continue;
          var translationJson = require(translationFile);
          var fileToWrite = translationStorePluginPath + '/' + translationFileName;
          saveTranslationToFile(fileToWrite, translationJson);
        }
      }
    });

    return cb(null);
  },

  getPluginLanguageTranslation: function (pluginName, language, callback) {
    var translationStorePluginPath = module.exports.getPluginTranslationStoragePath(pluginName);
    var translationFileName = language + '.' + TRANSLATION_FILE_EXTENSION;
    var translationFile = translationStorePluginPath + '/' + translationFileName;
    fs.readFile(translationFile, function (err, translationStr) {
      if (err) return callback(err);
      return callback(null, JSON.parse(translationStr));
    });
  },

  getPluginTranslationDetails: function (pluginTranslationPath, translationFiles, languageList, callback) {
    getFilesRecursivelyFromTopDir(pluginTranslationPath, translationFiles, languageList);
    return callback(null);
  },

  getPluginTranslationStoragePath: function (pluginName) {
    return TRANSLATION_STORE_PATH + '/' + pluginName;
  }

};

function saveTranslationToFile(translationFullFileName, translationJson) {
  var jsonToWrite = [];
  if (fs.existsSync(translationFullFileName)) {
    var prevTranslationJson = require(translationFullFileName);
    jsonToWrite = prevTranslationJson.concat(translationJson);
  } else {
    jsonToWrite = translationJson;
  }
  fs.writeFileSync(translationFullFileName, JSON.stringify(jsonToWrite, null, 4));
}

function getFilesRecursivelyFromTopDir(topDir, translationFiles, languageList) {
  fs.readdirSync(topDir).forEach(function (name) {
    var fullPath = path.join(topDir, name);
    var stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList);
    }
  });
}

function getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList) {
  var files = getFilesFromDir(fullPath);
  var fileLength = files.length;
  for (var i = 0; i < fileLength; i++) {
    var fullFilePath = files[i];
    var fileName = getFileName(fullFilePath);
    var fileExt = fileName.split('.').pop();
    if (fileName === fileExt) continue;
    if (fileExt !== TRANSLATION_FILE_EXTENSION) continue;
    translationFiles.push(fullFilePath);
    var lang  = fileName.substr(0, fileName.lastIndexOf('.'));
    if (languageList.indexOf(lang) !== -1) {
      continue;
    }
    languageList.push(lang);
  }
}

function getFilesFromDir(dir) {
  var fileList = [];

  var files = fs.readdirSync(dir);
  for (var i in files) {
    if (!files.hasOwnProperty(i)) continue;
    var name = dir + '/' + files[i];
    if (!fs.statSync(name).isDirectory()) {
      fileList.push(name);
    }
  }
  return fileList;
}

function getFileName(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

// Added this function because 'mkdirp' does not add more than 2 subdirectories
function createDirectoriesRecursively(fullDir) {
  process.execSync('mkdir -p ' + fullDir);
}

