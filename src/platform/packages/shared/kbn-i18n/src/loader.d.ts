/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TranslationInput } from './translation';
/**
 * Registers translation file with i18n loader
 * @param translationFilePath - Absolute path to the translation file to register.
 */
export declare function registerTranslationFile(translationFilePath: string): void;
/**
 * Registers array of translation files with i18n loader
 * @param arrayOfPaths - Array of absolute paths to the translation files to register.
 */
export declare function registerTranslationFiles(arrayOfPaths?: string[]): void;
/**
 * Returns an array of locales that have been registered with i18n loader
 * @returns registeredTranslations
 */
export declare function getRegisteredLocales(): string[];
/**
 * Returns translation messages by specified locale
 * @param locale
 * @returns translation messages
 */
export declare function getTranslationsByLocale(locale: string): Promise<TranslationInput>;
/**
 * Returns all translations for registered locales
 * @returns A Promise object
 * where keys are the locale and values are objects of translation messages
 */
export declare function getAllTranslations(): Promise<{
  [key: string]: TranslationInput;
}>;
/**
 * Registers passed translations files, loads them and returns promise with
 * all translation messages
 * @param paths - Array of absolute paths to the translation files
 * @returns A Promise object where
 * keys are the locale and values are objects of translation messages
 */
export declare function getAllTranslationsFromPaths(paths: string[]): Promise<{
  [key: string]: TranslationInput;
}>;
