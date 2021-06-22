/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ThemeTag } from '../../common';

interface Ref {
  ref: string;
}
export type StyleMap = Record<string, string | Ref | undefined>;

const getVersion = (tag: ThemeTag) => (tag.includes('v7') ? 7 : 8);
const getIsDark = (tag: ThemeTag) => tag.includes('dark');
const compare = (a: ThemeTag, b: ThemeTag) =>
  (getVersion(a) === getVersion(b) ? 1 : 0) + (getIsDark(a) === getIsDark(b) ? 1 : 0);

const getStyle = (styles: StyleMap, tag: ThemeTag) => {
  let style = styles[tag];

  // resolve references
  while (typeof style === 'object' && style !== null) {
    style = styles[style.ref];
  }

  return style;
};

export function injectStyle(styles: StyleMap) {
  const tag: ThemeTag = (window as any).__kbnThemeTag__;
  let style = getStyle(styles, tag);

  if (!style) {
    const missingTag = tag;
    const tags = Object.keys(styles) as ThemeTag[];

    style = getStyle(
      styles,
      tags
        .slice()
        .sort((a, b) => compare(b, tag) - compare(a, tag))
        .shift()!
    )!;

    // eslint-disable-next-line no-console
    console.error(
      new Error(
        `SASS files were not built for theme [${missingTag}]. Styles were compiled using the [${tag}] theme instead to keep Kibana somewhat usable. Please adjust the advanced settings to make use of [${tags}] or make sure the KBN_OPTIMIZER_THEMES environment variable includes [${missingTag}] in a comma separated list of themes you want to compile. You can also set it to "*" to build all themes.`
      )
    );
  }

  const styleEl: HTMLStyleElement = document.createElement('style');
  styleEl.textContent = style;
  document.head.appendChild(styleEl);
}
