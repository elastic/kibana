/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules.no_redundant_link_navigation;

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: { jsx: true },
  },
});

const error = (name) => ({
  messageId: 'redundantNavigation',
  data: { name },
});

ruleTester.run('@kbn/eslint/no_redundant_link_navigation', rule, {
  valid: [
    // plain href, routed by core
    { code: '<EuiLink href={url}>Open</EuiLink>' },
    // side effects only
    { code: '<EuiLink href={url} onClick={() => track("open")}>Open</EuiLink>' },
    // no href: explicit navigation is required
    {
      code: '<EuiButton onClick={(e) => { e.preventDefault(); navigateToApp("discover"); }} />',
    },
    { code: '<a href="#" onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />' },
    // navigation waits for async work
    {
      code: '<a href={url} onClick={async (e) => { e.preventDefault(); await save(); navigateToUrl(url); }} />',
    },
    // navigation inside a nested callback
    {
      code: '<a href={url} onClick={(e) => { e.preventDefault(); save().then(() => navigateToUrl(url)); }} />',
    },
    // navigation without preventDefault
    { code: '<a href={url} onClick={() => navigateToUrl(other)} />' },
    { code: '<a href={undefined} onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />' },
    { code: '<a {...props} onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />' },
    // core does not route these links, so the explicit handler changes behavior
    {
      code: '<a href={url} target="_blank" onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />',
    },
    {
      code: '<a href={url} target={target} onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />',
    },
    {
      code: '<a href={url} data-kbn-redirect-app-link-ignore onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />',
    },
    {
      code: 'const item = { href, target: "_blank", onClick: (e) => { e.preventDefault(); navigateToUrl(href); } };',
    },
    // handlers that cannot be resolved to a local function
    {
      code: `
        const Link = ({ onClick }) => {
          const handle = (e) => { e.preventDefault(); navigateToUrl(url); };
          return <a href={url} onClick={onClick} />;
        };
      `,
    },
    {
      code: "import { onClick } from './handlers'; const el = <a href={url} onClick={onClick} />;",
    },
    { code: '<a href={url} onClick={this.handleClick} />' },
    // the click never reaches the global handler on document.body
    {
      code: '<a href={url} onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigateToUrl(url); }} />',
    },
    // navigation options a link cannot express
    {
      code: '<a href={url} onClick={(e) => { e.preventDefault(); navigateToApp(app, { path, openInNewTab }); }} />',
    },
    {
      code: '<a href={url} onClick={(e) => { e.preventDefault(); navigateToUrl(url, { state: { from } }); }} />',
    },
    {
      code: '<a href={url} onClick={(e) => { e.preventDefault(); navigateToApp(app, options); }} />',
    },
    // some clicks are prevented without navigating
    {
      code: '<a href={url} onClick={(e) => { e.preventDefault(); if (inFlyout) { openFlyout(); return; } navigateToUrl(url); }} />',
    },
    {
      code: '<a href={url} onClick={(e) => { e.preventDefault(); return isA ? navigateToUrl(a) : navigateToUrl(b); }} />',
    },
    // guard that prevents without navigating
    {
      code: '<a href={url} onClick={(e) => { if (disabled) { e.preventDefault(); return; } navigateToUrl(url); }} />',
    },
    // core does not route these either
    { code: '<a href="#section" onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />' },
    { code: '<a href={null} onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />' },
    {
      code: '<a href={url} download onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />',
    },
    {
      code: '<a href={url} rel="noopener external" onClick={(e) => { e.preventDefault(); navigateToUrl(url); }} />',
    },
    // inner parameter shadows the redundant outer handler
    {
      code: `
        const onClick = (e) => { e.preventDefault(); navigateToUrl(url); };
        const Link = ({ onClick }) => <a href={url} onClick={onClick} />;
      `,
    },
  ],
  invalid: [
    {
      code: '<EuiLink href={url} onClick={(e) => { e.preventDefault(); application.navigateToUrl(url); }} />',
      errors: [error('navigateToUrl')],
    },
    {
      code: `
        const onClick = (event) => {
          event.preventDefault();
          navigateToApp('management');
        };
        const el = <EuiButton href={href} onClick={onClick} />;
      `,
      errors: [error('navigateToApp')],
    },
    {
      code: `
        const onClick = useCallback((event) => {
          event.preventDefault();
          core.application.navigateToUrl(href);
        }, [href]);
        const el = <a href={href} onClick={onClick} />;
      `,
      errors: [error('navigateToUrl')],
    },
    {
      code: 'const item = { href, onClick: (e) => { e.preventDefault(); navigateToUrl(href); } };',
      errors: [error('navigateToUrl')],
    },
    {
      code: `
        function onClick(e) { e.preventDefault(); navigateToUrl(href); }
        const item = { 'href': href, onClick };
      `,
      errors: [error('navigateToUrl')],
    },
    {
      code: `
        const onClick = React.useCallback(function (e) {
          if (e.button === 0 && !e.metaKey) {
            e.preventDefault();
            navigateToApp('discover');
          }
        }, []);
        const el = <a href="/app/discover" target="_self" onClick={onClick} />;
      `,
      errors: [error('navigateToApp')],
    },
    {
      code: '<a href={url} onClick={(e) => { track("open"); e.preventDefault(); navigateToApp(app, { path, deepLinkId }); }} />',
      errors: [error('navigateToApp')],
    },
    {
      code: '<a href="/app/home" onClick={(e) => { e.preventDefault(); return void navigateToUrl(url); }} />',
      errors: [error('navigateToUrl')],
    },
    {
      code: '<EuiCard href={url} onClick={(e) => { e?.preventDefault(); core.application?.navigateToUrl(url); }} />',
      errors: [error('navigateToUrl')],
    },
    // a guard before preventDefault() applies to navigation equally
    {
      code: '<a href={url} onClick={(e) => { if (e.metaKey) return; e.preventDefault(); navigateToUrl(url); }} />',
      errors: [error('navigateToUrl')],
    },
  ],
});
