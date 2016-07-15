import fs from 'fs';
import kibanaPackage from '../../../../utils/package_json';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import process from 'child_process';
import Promise from 'bluebird';

const readdir = Promise.promisify(fs.readdir);
const readFile = Promise.promisify(fs.readFile);
const stat = Promise.promisify(fs.stat);

const TRANSLATION_FILE_EXTENSION = 'json';
const TRANSLATION_STORE_PATH = kibanaPackage.__dirname + '/fixtures/translations';

const getPluginTranslationDetails = function (pluginTranslationPath, translationFiles, languageList) {
  return getFilesRecursivelyFromTopDir(pluginTranslationPath, translationFiles, languageList);
};

//TODO(hickeyma): Update to use https://github.com/elastic/kibana/pull/7562
const getTranslationStoragePath = function () {
  return TRANSLATION_STORE_PATH;
};

const getRegisteredTranslationLanguages = function () {
  let translationFiles = [];
  let languageList = [];
  const translationStorePath = getTranslationStoragePath();

  return getTranslationDetailsFromDirectory(translationStorePath, translationFiles, languageList).then(function () {
    return languageList;
  });
};

const registerTranslations = function (pluginTranslationPath) {
  let translationFiles = [];
  let languageList = [];
  const translationStorePath = getTranslationStoragePath();

  return getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList).then(function () {
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
      throw err;
    }
  });

};

const getRegisteredLanguageTranslations = function (language) {
  const translationStorePath = getTranslationStoragePath();
  const translationFileName = language + '.' + TRANSLATION_FILE_EXTENSION;
  const translationFile = translationStorePath + '/' + translationFileName;

  return readFile(translationFile, 'utf8').then(function (translationStr) {
    let translationJson = [];
    try {
      translationJson = JSON.parse(translationStr);
    } catch (err) {
      throw new Error('Bad ' + language + ' translation strings. Reason: ' + err);
    }
    return translationJson;
  }).catch(function (e) {
    throw new Error('Failed to read translation file. Reason: ' + e);
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
  return readdir(topDir).then((topDirectoryListing) => {
    return Promise.map(topDirectoryListing, (listing) => {
      const fullPath = path.join(topDir, listing);
      return stat(fullPath).then((stats) => {
        if (stats.isDirectory()) {
          getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList);
        } else {
          getTranslationDetailsFromFile(fullPath, translationFiles, languageList);
        }
      });
    });
  });
}

function getTranslationDetailsFromDirectory(dir, translationFiles, languageList) {
  return readdir(dir).then((dirListing) => {
    return Promise.map(dirListing, (listing) => {
      const fullPath = path.join(dir, listing);
      return stat(fullPath).then((stats) => {
        if (!stats.isDirectory()) {
          getTranslationDetailsFromFile(fullPath, translationFiles, languageList);
        }
      });
    });
  });
}

function getTranslationDetailsFromFile(fullFileName, translationFiles, languageList) {
  const fileName = getFileName(fullFileName);
  const fileExt = fileName.split('.').pop();
  if (fileName === fileExt) return;
  if (fileExt !== TRANSLATION_FILE_EXTENSION) return;
  translationFiles.push(fullFileName);
  const lang  = fileName.substr(0, fileName.lastIndexOf('.'));
  if (languageList.indexOf(lang) === -1) {
    languageList.push(lang);
  }
}

function getFileName(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLanguageTranslations = getRegisteredLanguageTranslations;
module.exports.getTranslationStoragePath = getTranslationStoragePath;
module.exports.getRegisteredTranslationLanguages = getRegisteredTranslationLanguages;
module.exports.getPluginTranslationDetails = getPluginTranslationDetails;
