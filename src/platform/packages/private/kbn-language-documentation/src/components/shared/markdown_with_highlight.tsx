/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDefaultEuiMarkdownPlugins, EuiLink, EuiMarkdownFormat } from '@elastic/eui';
import type { Plugin as MarkdownPlugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';
import React, { useMemo } from 'react';

/**
 * Markdown component, with a plugin that supports highlighting text wrapped in ==double equals==
 */
export const MarkdownWithHighlight = React.memo(
  ({
    markdownContent,
    openLinksInNewTab = false,
  }: {
    markdownContent: string;
    openLinksInNewTab?: boolean;
  }) => {
    const { modifiedParsingPlugins, modifiedProcessingPlugins } = useMemo(() => {
      const { parsingPlugins, processingPlugins } = getDefaultEuiMarkdownPlugins({
        exclude: ['tooltip', 'lineBreaks', 'linkValidator'],
      });

      // Components overwrites
      if (openLinksInNewTab) {
        processingPlugins[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;
      }
      processingPlugins[1][1].components.highlightPlugin = highlightProcessorPlugin;

      return {
        modifiedParsingPlugins: [...parsingPlugins, highlightParsingPlugin],
        modifiedProcessingPlugins: processingPlugins,
      };
    }, [openLinksInNewTab]);

    return (
      <EuiMarkdownFormat
        textSize="relative"
        color="inherit"
        parsingPluginList={modifiedParsingPlugins}
        processingPluginList={modifiedProcessingPlugins}
      >
        {markdownContent}
      </EuiMarkdownFormat>
    );
  }
);

const highlightProcessorPlugin = ({ content, ...props }: { content: string }) => (
  <mark {...props}>{content}</mark>
);

const highlightParsingPlugin: MarkdownPlugin = function (this) {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  const tokenizeHighlight: RemarkTokenizer = function (eat, value, silent) {
    const match = value.match(/^==(.*?)==/);
    if (!match) return false;

    if (silent) return true;

    const [fullMatch, content] = match;
    return eat(fullMatch)({
      type: 'highlightPlugin',
      content,
    });
  };

  tokenizeHighlight.locator = (value: string, fromIndex: number) => {
    return value.indexOf('==', fromIndex);
  };

  tokenizers.highlight = tokenizeHighlight;
  methods.splice(methods.indexOf('text'), 0, 'highlight');
};
