/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { RemarkTokenizer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Plugin } from 'unified';
import { DASHBOARD_LINK_PREFIX } from './dashboard_links_plugin';

export const DashboardLinkParser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  const dashboardLinkTokenizer: RemarkTokenizer = function (eat, value, silent) {
    if (!value.startsWith(DASHBOARD_LINK_PREFIX)) return false;

    const nextCharacter = value[DASHBOARD_LINK_PREFIX.length];
    if (nextCharacter !== '{') return false;
    if (silent) return true;

    let linkConfigString = '';
    let openObjects = 0;

    for (let i = DASHBOARD_LINK_PREFIX.length; i < value.length; i++) {
      const char = value[i];
      if (char === '{') {
        openObjects++;
        linkConfigString += char;
      } else if (char === '}') {
        openObjects--;
        if (openObjects === -1) {
          break;
        }
        linkConfigString += char;
      } else {
        linkConfigString += char;
      }
    }

    try {
      const linkConfig = JSON.parse(linkConfigString);
      const match = `${DASHBOARD_LINK_PREFIX}${linkConfigString}}`;
      return eat(match)({
        type: 'DashboardLinks',
        ...linkConfig,
      });
    } catch (err) {
      this.file.fail(
        i18n.translate('dashboardMarkdown.dashboardLink.buttonLabel', {
          values: { err },
          defaultMessage: 'Unable to parse dashboard link JSON: {err}',
        })
      );
    }
  };

  dashboardLinkTokenizer.locator = (value: string, fromIndex: number) => {
    return value.indexOf(DASHBOARD_LINK_PREFIX, fromIndex);
  };
  tokenizers.DashboardLinks = dashboardLinkTokenizer;
  methods.splice(methods.indexOf('text'), 0, 'DashboardLinks');
};
