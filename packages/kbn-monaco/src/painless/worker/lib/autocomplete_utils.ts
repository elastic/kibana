/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
 */
export const hasDeclaredType = (activeLineWords: string[], primitives: string[]): boolean => {
  return activeLineWords.length === 2 && primitives.includes(activeLineWords[0]);
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
 * 1. If the preceding word is a type, e.g., "boolean", we assume the user is declaring a variable name
 * 2. If the string contains a "dot" character, we assume the user is attempting to access a property that we do not have information for
 */
export const showStaticSuggestions = (
  activeTyping: string,
  activeLineWords: string[],
  primitives: string[]
): boolean => {
  const activeTypingParts = activeTyping.split('.');

  return hasDeclaredType(activeLineWords, primitives) === false && activeTypingParts.length === 1;
};
