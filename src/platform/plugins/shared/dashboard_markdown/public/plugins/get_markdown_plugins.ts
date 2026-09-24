/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiMarkdownLinkValidator, getDefaultEuiMarkdownPlugins } from '@elastic/eui';
import { resolveRelativeLinksPlugin } from './resolve_relative_links';

export const getMarkdownPlugins = (openLinksInNewTab: boolean) => {
  const plugins = getDefaultEuiMarkdownPlugins({
    processingConfig: {
      linkProps: { target: openLinksInNewTab ? '_blank' : '_self' },
    },
  });

  const linkValidatorIndex = plugins.parsingPlugins.findIndex(
    (entry) => (Array.isArray(entry) ? entry[0] : entry) === euiMarkdownLinkValidator
  );

  plugins.parsingPlugins.splice(
    linkValidatorIndex === -1 ? plugins.parsingPlugins.length : linkValidatorIndex,
    0,
    [resolveRelativeLinksPlugin(), {}]
  );

  return plugins;
};
