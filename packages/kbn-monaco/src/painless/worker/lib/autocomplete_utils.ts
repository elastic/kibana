/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * If the active typing contains dot notation, we assume we need to access the object's properties
 * Currently only supporting one-level deep nesting
 */
export const isAccessingProperty = (activeTyping: string): boolean => {
  const activeTypingParts = activeTyping.split('.');

  if (activeTypingParts.length !== 2) {
    return false;
  }

  const maybeProperty = activeTypingParts[1];

  return maybeProperty.includes('(') === false;
};

/**
 * If the preceding word is a primitive type, e.g., "boolean",
 * we assume the user is declaring a variable and will skip autocomplete
 *
 * Note: this isn't entirely exhaustive.
 * For example, you may use a class as a type, e.g., "String myVar ="
 */
export const hasDeclaredType = (activeLineWords: string[], primitives: string[]): boolean => {
  return activeLineWords.length === 2 && primitives.includes(activeLineWords[0]);
};

/**
 * If the active line words contains the "boolean" type and "=" token,
 * we assume the user is defining a boolean value and skip autocomplete
 */
export const isDefiningBoolean = (activeLineWords: string[]): boolean => {
  if (activeLineWords.length === 4) {
    const maybePrimitiveType = activeLineWords[0];
    const maybeEqualToken = activeLineWords[2];
    return maybePrimitiveType === 'boolean' && maybeEqualToken === '=';
  }
  return false;
};

/**
 * If the active typing contains a start or end quotation mark,
 * we assume the user is defining a string and skip autocomplete
 */
export const isDefiningString = (activeTyping: string): boolean => {
  const quoteTokens = [`'`, `"`];
  const activeTypingParts = activeTyping.split('');
  const startCharacter = activeTypingParts[0];
  const endCharacter = activeTypingParts[activeTypingParts.length - 1];
  return quoteTokens.includes(startCharacter) || quoteTokens.includes(endCharacter);
};

/**
 * Check if the preceding word contains the "new" keyword
 */
export const isConstructorInstance = (activeLineWords: string[]): boolean => {
  return activeLineWords[activeLineWords.length - 2] === 'new';
};

/**
 * Check if the user appears to be accessing a document field
 */
export const isDeclaringField = (activeTyping: string): boolean => {
  const triggerString = `doc['`;
  const startIndex = activeTyping.indexOf(triggerString);
  const endIndex = startIndex + (triggerString.length - 1);

  return startIndex !== -1 && activeTyping.length - 1 === endIndex;
};

/**
 * Static suggestions serve as a catch-all most of the time
 * However, there are a few situations where we do not want to show them and instead default to the built-in monaco (abc) autocomplete
 * 1. If the preceding word is a primitive type, e.g., "boolean", we assume the user is declaring a variable name
 * 2. If the string contains a "dot" character, we assume the user is attempting to access a property that we do not have information for
 * 3. If the user is defining a variable with a boolean type, e.g., "boolean myBoolean ="
 * 4. If the user is defining a string
 */
export const showStaticSuggestions = (
  activeTyping: string,
  activeLineWords: string[],
  primitives: string[]
): boolean => {
  const activeTypingParts = activeTyping.split('.');

  return (
    hasDeclaredType(activeLineWords, primitives) === false &&
    isDefiningBoolean(activeLineWords) === false &&
    isDefiningString(activeTyping) === false &&
    activeTypingParts.length === 1
  );
};
