/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TemplateContext } from '../template_context';
import { dockerfileTemplate } from './dockerfile.template';

describe('native watchdog POC image build', () => {
  it.each(['x64', 'aarch64'])('builds both runtime bindings on %s', (architecture) => {
    const rendered = dockerfileTemplate.generator({
      baseImage: 'wolfi',
      serverless: true,
      architecture,
    } as TemplateContext);
    expect(rendered).toContain('COPY native_watchdog/' + architecture);
    expect(rendered).toContain('for variant in default pointer-compression');
    expect(rendered).toContain('node/$variant/bin/node /tmp/native_watchdog/build.ts');
    expect(rendered).toContain('/tmp/native_watchdog/$variant/include/node');
    expect(rendered).toContain('/usr/share/kibana/node/$variant/lib/event_loop_watchdog');
    expect(rendered).toContain('p.initialize(10101); p.dispose(id)');
    const finalStage = rendered.slice(rendered.lastIndexOf('FROM '));
    expect(finalStage).not.toContain('build-base');
    expect(finalStage).not.toContain('COPY native_watchdog');
  });

  it('does not add a compiler or addon to stateful images', () => {
    const rendered = dockerfileTemplate.generator({
      baseImage: 'wolfi',
      serverless: false,
    } as TemplateContext);
    expect(rendered).not.toContain('native_watchdog');
    expect(rendered).not.toContain('build-base');
  });
});
