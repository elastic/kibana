export function isIndexPatternQueryValid(pattern, illegalCharacters) {
  if (!pattern || !pattern.length) {
    return false;
  }

  if (pattern === '.' || pattern === '..') {
    return false;
  }

  return !illegalCharacters.some(char => pattern.includes(char));
}
