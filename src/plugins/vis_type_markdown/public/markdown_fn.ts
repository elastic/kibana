/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Render } from '@kbn/expressions-plugin/public';
import { Arguments, MarkdownVisParams } from './types';

export interface MarkdownVisRenderValue {
  visType: 'markdown';
  visParams: MarkdownVisParams;
}

export type MarkdownVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'markdownVis',
  unknown,
  Arguments,
  Render<MarkdownVisRenderValue>
>;

export const createMarkdownVisFn = (): MarkdownVisExpressionFunctionDefinition => ({
  name: 'markdownVis',
  type: 'render',
  inputTypes: [],
  help: i18n.translate('visTypeMarkdown.function.help', {
    defaultMessage: 'Markdown visualization',
  }),
  args: {
    markdown: {
      types: ['string'],
      aliases: ['_'],
      required: true,
      help: i18n.translate('visTypeMarkdown.function.markdown.help', {
        defaultMessage: 'Markdown to render',
      }),
    },
    font: {
      types: ['style'],
      help: i18n.translate('visTypeMarkdown.function.font.help', {
        defaultMessage: 'Font settings.',
      }),
      default: `{font size=12}`,
    },
    openLinksInNewTab: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('visTypeMarkdown.function.openLinksInNewTab.help', {
        defaultMessage: 'Opens links in new tab',
      }),
    },
  },
  fn(input, args) {
    return {
      type: 'render',
      as: 'markdown_vis',
      value: {
        visType: 'markdown',
        visParams: {
          markdown: args.markdown,
          openLinksInNewTab: args.openLinksInNewTab,
          fontSize: parseInt(args.font.spec.fontSize || '12', 10),
        },
      },
    };
  },
});
