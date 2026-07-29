/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPageHtml } from './page_template';

describe('buildPageHtml', () => {
  const config = { transparent: false };
  const width = 800;
  const height = 600;

  it('renders a valid HTML skeleton with the correct viewport dimensions', () => {
    const html = buildPageHtml('name: hello', config, width, height);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(`width=${width}`);
    expect(html).toContain(`width: ${width}px`);
    expect(html).toContain(`height: ${height}px`);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<script src="/bundle.js"></script>');
  });

  it('embeds YAML in kbn-workflow-yaml data attribute', () => {
    const html = buildPageHtml('name: hello', config, width, height);
    expect(html).toContain('<kbn-workflow-yaml data="name: hello"></kbn-workflow-yaml>');
  });

  it('embeds config in kbn-graph-config data attribute as JSON', () => {
    const html = buildPageHtml('name: hello', config, width, height);
    expect(html).toContain(
      '<kbn-graph-config data="{&quot;transparent&quot;:false}"></kbn-graph-config>'
    );
  });

  it('escapes </script> in YAML so it cannot break out of any script block', () => {
    const maliciousYaml = 'name: "</script><script>alert(1)</script>"';
    const html = buildPageHtml(maliciousYaml, config, width, height);

    // The raw payload must not appear verbatim anywhere in the output.
    expect(html).not.toContain('</script><script>alert(1)</script>');

    // The < must be HTML-escaped inside the attribute.
    expect(html).toContain('&lt;/script&gt;');

    // The kbn-workflow-yaml element must still be present.
    expect(html).toContain('<kbn-workflow-yaml data="');
  });

  it('hides the custom data elements via CSS', () => {
    const html = buildPageHtml('name: hello', config, width, height);
    expect(html).toContain('kbn-workflow-yaml, kbn-graph-config { display: none; }');
  });
});
