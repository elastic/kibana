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

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Render } from '../../expressions/public';
import { Arguments, MarkdownVisParams } from './types';

interface RenderValue {
  visType: 'markdown';
  visConfig: MarkdownVisParams;
}

export type MarkdownVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'markdownVis',
  unknown,
  Arguments,
  Render<RenderValue>
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
        visConfig: {
          markdown: args.markdown,
          openLinksInNewTab: args.openLinksInNewTab,
          fontSize: parseInt(args.font.spec.fontSize || '12', 10),
        },
      },
    };
  },
});
