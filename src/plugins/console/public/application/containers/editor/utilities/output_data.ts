/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  YAML_LANG_ID,
  CONSOLE_OUTPUT_LANG_ID,
  CONSOLE_OUTPUT_JSON_THEME_ID,
  CONSOLE_OUTPUT_YAML_THEME_ID,
  CONSOLE_OUTPUT_TEXT_THEME_ID,
} from '@kbn/monaco';
import { expandLiteralStrings } from '../../../../shared_imports';

export const isJSONContentType = (contentType?: string) =>
  Boolean(contentType && contentType.indexOf('application/json') >= 0);

export const isMapboxVectorTile = (contentType?: string) =>
  contentType?.includes('application/vnd.mapbox-vector-tile') ?? false;

/**
 * Best effort expand literal strings
 */
export const safeExpandLiteralStrings = (data: string): string => {
  try {
    return expandLiteralStrings(data);
  } catch (e) {
    return data;
  }
};

const TEXT_LANGUAGE_ID = 'text';

export const languageForContentType = (contentType?: string) => {
  if (!contentType) {
    return TEXT_LANGUAGE_ID;
  }
  if (isJSONContentType(contentType) || isMapboxVectorTile(contentType)) {
    // Using hjson will allow us to use comments in editor output and solves the problem with error markers
    return CONSOLE_OUTPUT_LANG_ID;
  } else if (contentType.indexOf('application/yaml') >= 0) {
    return YAML_LANG_ID;
  }
  return TEXT_LANGUAGE_ID;
};

export const getThemeForLanguage = (language: string) => {
  switch (language) {
    case CONSOLE_OUTPUT_LANG_ID: {
      return CONSOLE_OUTPUT_JSON_THEME_ID;
    }
    case YAML_LANG_ID: {
      return CONSOLE_OUTPUT_YAML_THEME_ID;
    }
    case TEXT_LANGUAGE_ID: {
      return CONSOLE_OUTPUT_TEXT_THEME_ID;
    }
    default: {
      return undefined;
    }
  }
};
