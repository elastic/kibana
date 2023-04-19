/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { Global, css } from '@emotion/react';
import * as tocbot from 'tocbot';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPageSidebar,
  EuiHorizontalRule,
} from '@elastic/eui';

export const TableOfContents = () => {
  useEffect(() => {
    tocbot.init({
      tocSelector: '[data-test-subj="toc-content"]',
      contentSelector: '[data-test-subj="article-content"]',
      headingSelector: 'h1, h2, h3',
      listClass: 'euiSideNav',
      listItemClass: 'euiSideNavItem',
      linkClass: 'euiSideNavItemButton',
      // activeLinkClass: 'docArticle__tocContent--active',
      includeTitleTags: true,
      headingsOffset: 128,
      scrollSmoothOffset: 128,
      scrollSmooth: false,
      scrollSmoothDuration: 640,
    });

    tocbot.refresh();
  });

  const tocStyle = css`
    .storybook-docs-toc {
      .euiSideNavItem {
        padding-left: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .is-active-li > a {
        font-weight: 700;
        color: #343741;
      }
    }
  `;
  return (
    <>
      <Global styles={tocStyle} />
      <EuiPageSidebar sticky className="storybook-docs-toc">
        <EuiFlexGroup
          direction="column"
          gutterSize="l"
          responsive={false}
          style={{ height: '100%' }}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <p>On this page</p>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <aside>
              <div data-test-subj="toc-content" />
            </aside>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSidebar>
    </>
  );
};
