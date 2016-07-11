import fs from 'fs';
import kibanaPackage from '../../../../utils/package_json';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import process from 'child_process';

const TRANSLATION_FILE_EXTENSION = 'json';
const TRANSLATION_STORE_PATH = kibanaPackage.__dirname + '/fixtures/translations';

let getPluginTranslationDetails = function (pluginTranslationPath, translationFiles, languageList, callback) {
  try {
    getFilesRecursivelyFromTopDir(pluginTranslationPath, translationFiles, languageList);
  } catch (err) {
    return callback(err);
  }
  return callback(null);
};

//TODO(hickeyma): Update to use https://github.com/elastic/kibana/pull/7562
let getTranslationStoragePath = function () {
  return TRANSLATION_STORE_PATH;
};

let getRegisteredTranslationLanguages = function (cb) {
  let translationFiles = [];
  let languageList = [];
  const translationStorePath = getTranslationStoragePath();
  try {
    getTranslationDetailsFromDirectory(translationStorePath, translationFiles, languageList);
  } catch (err) {
    return cb(err);
  }
  return cb(null, languageList);
};

let registerTranslations = function (pluginTranslationPath, cb) {
  let translationFiles = [];
  let languageList = [];
  const translationStorePath = getTranslationStoragePath();

  getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);

    try {
      if (!fs.existsSync(translationStorePath)) {
        mkdirp.sync(translationStorePath);
      }
      for (let fileIndx in translationFiles) {
        if (!translationFiles.hasOwnProperty(fileIndx)) continue;
        const translationFile = translationFiles[fileIndx];
        const translationFileName = getFileName(translationFile);
        const translationJson = require(translationFile);
        const fileToWrite = translationStorePath + '/' + translationFileName;
        saveTranslationToFile(fileToWrite, translationJson);
      }
    } catch (err) {
      return cb(err);
    }
  });

  return cb(null);
};

let getRegisteredLanguageTranslations = function (language, callback) {
  const translationStorePath = getTranslationStoragePath();
  const translationFileName = language + '.' + TRANSLATION_FILE_EXTENSION;
  const translationFile = translationStorePath + '/' + translationFileName;
  fs.readFile(translationFile, function (err, translationStr) {
    if (err) return callback(err);
    let translationJson = [];
    try {
      translationJson = JSON.parse(translationStr);
    } catch (e) {
      return callback('Bad ' + language + ' translation strings. Error: ' + err);
    }
    return callback(null, translationJson);
  });
};

function saveTranslationToFile(translationFullFileName, translationToAddJson) {
  let jsonToWrite = [];
  if (fs.existsSync(translationFullFileName)) {
    const currentTranslationJson = require(translationFullFileName);
    jsonToWrite = currentTranslationJson;
    for (let key in translationToAddJson) {
      if (translationToAddJson.hasOwnProperty(key)) {
        const attrName = key;
        const attrValue = translationToAddJson[key];
        jsonToWrite[attrName] = attrValue;
      }
    }
  } else {
    jsonToWrite = translationToAddJson;
  }
  fs.writeFileSync(translationFullFileName, JSON.stringify(jsonToWrite));
}

function getFilesRecursivelyFromTopDir(topDir, translationFiles, languageList) {
  fs.readdirSync(topDir).forEach(function (name) {
    const fullPath = path.join(topDir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList);
    }
  });
}

function getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList) {
  const files = getFilesFromDir(fullPath);
  const fileLength = files.length;
  for (let i = 0; i < fileLength; i++) {
    const fullFilePath = files[i];
    const fileName = getFileName(fullFilePath);
    const fileExt = fileName.split('.').pop();
    if (fileName === fileExt) continue;
    if (fileExt !== TRANSLATION_FILE_EXTENSION) continue;
    translationFiles.push(fullFilePath);
    const lang  = fileName.substr(0, fileName.lastIndexOf('.'));
    if (languageList.indexOf(lang) !== -1) {
      continue;
    }
    languageList.push(lang);
  }
}

function getFilesFromDir(dir) {
  let fileList = [];

  const files = fs.readdirSync(dir);
  for (let i in files) {
    if (!files.hasOwnProperty(i)) continue;
    const name = dir + '/' + files[i];
    if (!fs.statSync(name).isDirectory()) {
      fileList.push(name);
    }
  }
  return fileList;
}

function getFileName(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLanguageTranslations = getRegisteredLanguageTranslations;
module.exports.getTranslationStoragePath = getTranslationStoragePath;
module.exports.getRegisteredTranslationLanguages = getRegisteredTranslationLanguages;
module.exports.getPluginTranslationDetails = getPluginTranslationDetails;
