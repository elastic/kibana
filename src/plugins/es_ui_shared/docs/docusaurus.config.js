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

module.exports = {
  title: 'Elasticsearch UI docs',
  tagline: 'Everything you need to know about our reusable solutions',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'elastic',
  projectName: 'esUiSharedDocs',
  githubHost: 'github.com',
  themeConfig: {
    navbar: {
      title: 'Elasticsearch UI docs',
      logo: {
        alt: 'Elasticsearch UI docs Logo',
        src: 'img/kibana.png',
      },
      items: [
        {
          to: 'docs/introduction',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          to: 'docs/form_lib/getting_started/about',
          activeBasePath: 'docs',
          label: 'Form lib',
          position: 'left',
        },
        {
          href: 'https://github.com/elastic/kibana/tree/master/src/plugins/es_ui_shared/README.md',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Form hook lib',
              to: 'docs/',
            },
            {
              label: 'Global flyout',
              to: 'docs/doc2/',
            },
          ],
        },
        {
          title: 'Repositories',
          items: [
            {
              label: 'GitHub Kibana',
              href: 'https://github.com/elastic/kibana',
            },
            {
              label: 'GitHub Elasticsearch',
              href: 'https://github.com/elastic/elasticsearch',
            },
          ],
        },
      ],
      copyright: `Built with love by the Elasticsearch UI team.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          // It is recommended to set document id as docs home page (`docs/` path).
          // homePageId: 'doc1',
          homePageId: 'docs/form_lib/about',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/elastic/kibana/edit/master/src/plugins/es_ui_shared/docs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
