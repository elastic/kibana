/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDefaultEuiMarkdownPlugins, EuiLink, EuiMarkdownFormat } from '@elastic/eui';
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

      const parsingPluginList = [...parsingPlugins, highlightParsingPlugin];
      const processingPluginList = [...processingPlugins];

      // Components overwrites
      if (openLinksInNewTab) {
        (processingPluginList[1] as any)[1].components.a = (props: any) => (
          <EuiLink {...props} target="_blank" />
        );
      }
      (processingPluginList[1] as any)[1].components.highlightPlugin = highlightProcessorPlugin;

      return {
        modifiedParsingPlugins: parsingPluginList,
        modifiedProcessingPlugins: processingPluginList,
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

const highlightProcessorPlugin = ({ content, ...props }: any) => <mark {...props}>{content}</mark>;

const highlightParsingPlugin = function (this: any) {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  function tokenizeHighlight(eat: any, value: string, silent: boolean) {
    const match = value.match(/^==(.*?)==/);
    if (!match) return false;

    if (silent) return true;

    const [fullMatch, content] = match;
    return eat(fullMatch)({
      type: 'highlightPlugin',
      content,
    });
  }

  tokenizeHighlight.locator = (value: string, fromIndex: number) => {
    return value.indexOf('==', fromIndex);
  };

  tokenizers.highlight = tokenizeHighlight;
  methods.splice(methods.indexOf('text'), 0, 'highlight');
};
