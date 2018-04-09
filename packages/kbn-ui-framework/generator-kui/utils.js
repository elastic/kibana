function makeComponentName(str, usePrefix = true) {
  const words = str.split('_');

  const componentName = words.map(function (word) {
    return upperCaseFirstLetter(word);
  }).join('');

  return `${usePrefix ? 'Kui' : ''}${componentName}`;
}

function lowerCaseFirstLetter(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toLowerCase() + txt.substr(1);
  });
}

function upperCaseFirstLetter(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
  });
}

function addDirectoryToPath(path, dirName, shouldMakeDirectory) {
  if (shouldMakeDirectory) {
    return path + '/' + dirName;
  }
  return path;
}

module.exports = {
  makeComponentName: makeComponentName,
  lowerCaseFirstLetter: lowerCaseFirstLetter,
  upperCaseFirstLetter: upperCaseFirstLetter,
  addDirectoryToPath: addDirectoryToPath,
};
