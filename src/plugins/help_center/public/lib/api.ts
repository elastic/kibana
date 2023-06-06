/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, map, Observable, ReplaySubject, takeUntil } from 'rxjs';
import {
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
  ChromeHelpExtensionMenuGitHubLink,
  CoreStart,
} from '@kbn/core/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import {
  GITHUB_CREATE_ISSUE_LINK,
  KIBANA_FEEDBACK_LINK,
} from '@kbn/core-chrome-browser-internal/src/constants';
import { FetchResult } from '../types';

export interface HelpCenterApi {
  /**
   * The current fetch results
   */
  kibanaVersion: string;
  fetchResults$: Observable<void | null | FetchResult>;
  username?: string;
}

/*
 * Creates an Observable to HelpCenter items, powered by the main interval
 * Computes hasNew value from new item hashes saved in localStorage
 */
export async function getApi(
  kibanaVersion: string,
  core: CoreStart,
  stop$: ReplaySubject<void>,
  security?: SecurityPluginStart
): Promise<HelpCenterApi> {
  const fetchResults$ = combineLatest([
    core.chrome.getHelpExtension$(),
    core.chrome.getHelpSupportUrl$(),
    core.chrome.getGlobalHelpExtensionMenuLinks$(),
  ]).pipe(
    takeUntil(stop$),
    map(([helpExtension, helpSupportLink, globalHelpExtensionMenuLinks]) => {
      const documentationLinks: Array<
        ChromeHelpExtensionMenuDocumentationLink & { title: string; priority: number }
      > = [
        {
          title: 'About Kibana',
          priority: -1, // should always go last since it's the most general
          linkType: 'documentation',
          iconType: 'logoKibana',
          href: core.docLinks.links.kibana.guide,
        },
      ];

      let githubLink: ChromeHelpExtensionMenuDiscussLink = {
        linkType: 'discuss',
        title: 'Open an issue on Github',
        href: GITHUB_CREATE_ISSUE_LINK,
        iconType: 'logoGithub',
      };

      const contactLinks: ChromeHelpExtensionMenuDiscussLink[] = [
        {
          linkType: 'discuss',
          title: 'Give feedback',
          iconType: 'discuss',
          href: KIBANA_FEEDBACK_LINK,
        },
      ];
      if (helpSupportLink) {
        contactLinks.push({
          linkType: 'discuss',
          title: 'Ask Elastic',
          iconType: 'logoElastic',
          href: helpSupportLink,
        });
      }

      if (helpExtension) {
        const links = helpExtension.links ?? [];
        links.map((link) => {
          switch (link.linkType) {
            case 'documentation': {
              documentationLinks.push({
                title: 'About ' + helpExtension.appName,
                ...link,
                priority: link.priority ?? 0,
              });
              break;
            }
            case 'github': {
              githubLink = {
                ...link,
                title: 'Open an issue on Github',
                iconType: 'logoGithub',
                linkType: 'discuss',
                href: createGithubUrl(
                  (link as ChromeHelpExtensionMenuGitHubLink).labels,
                  (link as ChromeHelpExtensionMenuGitHubLink).title
                ),
              };
              break;
            }
            case 'discuss': {
              contactLinks.push(link as ChromeHelpExtensionMenuDiscussLink);
              break;
            }
            case 'custom': {
              contactLinks.push({
                ...link,
                linkType: 'discuss',
              } as ChromeHelpExtensionMenuDiscussLink);
              break;
            }
            default:
              break;
          }
        });
      }
      contactLinks.push(githubLink);

      return {
        global: globalHelpExtensionMenuLinks.sort((a, b) => b.priority - a.priority),
        documentation: documentationLinks.sort((a, b) => b.priority - a.priority),
        contact: contactLinks,
      };
    })
  );

  const user = await security?.authc.getCurrentUser();

  return {
    username: user?.full_name,
    kibanaVersion,
    fetchResults$,
  };
}

const createGithubUrl = (labels: string[], title?: string) => {
  const url = new URL('https://github.com/elastic/kibana/issues/new?');

  if (labels.length) {
    url.searchParams.set('labels', labels.join(','));
  }

  if (title) {
    url.searchParams.set('title', title);
  }

  return url.toString();
};
