/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ElementFactory } from '../types';
import { getElementsStrings } from '../i18n';

export function translateElements(elements: ElementFactory[] = []) {
  return elements.map((elFactory) => {
    const element = elFactory();
    const { name } = element;
    const strings = getElementsStrings();
    const elementStrings = strings[name] ?? {};
    element.displayName = elementStrings['displayName'] ?? element.displayName;
    element.help = elementStrings.help ?? element.help;

    return () => element;
  });
}
