/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { renderCommonWorkerYaml } from './worker_template_values';

const LINE_YAML = `settings:
  __WORKER_RUN_AS_LINE__
  concurrency:
    max: 1
consts:
  worker_settings:
    settingsVersion: __WORKER_SETTINGS_VERSION__
    autonomy: "__WORKER_AUTONOMY_LEVEL__"
`;

const BLOCK_YAML = `name: Worker
__WORKER_RUN_AS_BLOCK__
triggers:
  - type: manual
consts:
  worker_settings:
    settingsVersion: __WORKER_SETTINGS_VERSION__
    autonomy: "__WORKER_AUTONOMY_LEVEL__"
`;

const values = { settingsVersion: 1, autonomyLevel: 'manual' as const };

describe('renderCommonWorkerYaml run_as', () => {
  it('renders a quoted run_as line inside an existing settings block', () => {
    const yaml = renderCommonWorkerYaml(LINE_YAML, { ...values, serviceAccountId: 'account-a' });
    const parsed = parse(yaml) as { settings: { run_as?: string; concurrency: { max: number } } };

    expect(parsed.settings).toEqual({ run_as: 'account-a', concurrency: { max: 1 } });
    expect(yaml).not.toContain('__WORKER_RUN_AS_LINE__');
  });

  it('drops the run_as line when no service account is set', () => {
    const yaml = renderCommonWorkerYaml(LINE_YAML, values);
    const parsed = parse(yaml) as { settings: { run_as?: string } };

    expect(parsed.settings.run_as).toBeUndefined();
    expect(yaml).not.toContain('run_as');
  });

  it('renders a settings block when the worker has no other settings', () => {
    const yaml = renderCommonWorkerYaml(BLOCK_YAML, { ...values, serviceAccountId: 'say "hi"' });
    const parsed = parse(yaml) as { settings?: { run_as?: string } };

    expect(parsed.settings).toEqual({ run_as: 'say "hi"' });
  });

  it('replaces a null-key placeholder so the unrendered template stays valid YAML', () => {
    const yaml = renderCommonWorkerYaml(
      BLOCK_YAML.replace('__WORKER_RUN_AS_BLOCK__\n', '__WORKER_RUN_AS_BLOCK__:\n'),
      { ...values, serviceAccountId: 'account-a' }
    );
    const parsed = parse(yaml) as { settings?: { run_as?: string } };

    expect(parsed.settings).toEqual({ run_as: 'account-a' });
  });

  it('omits the settings block when the worker runs as the current user', () => {
    const yaml = renderCommonWorkerYaml(BLOCK_YAML, values);
    const parsed = parse(yaml) as { settings?: unknown };

    expect(parsed.settings).toBeUndefined();
    expect(yaml).not.toContain('__WORKER_RUN_AS_BLOCK__');
  });
});
