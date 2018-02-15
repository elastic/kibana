export function containsInvalidCharacters(pattern, illegalCharacters) {
  return !illegalCharacters.some(char => pattern.includes(char));
}
