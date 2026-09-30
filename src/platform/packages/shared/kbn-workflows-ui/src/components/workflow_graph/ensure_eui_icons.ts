/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sync-warm EUI icons used by the visual builder.
 *
 * Kibana resolves `@elastic/eui` → `optimize/es`. Dynamic `require()` chunks for
 * less-common glyphs (accordion chevron, node overflow menu, …) can stay in the
 * EuiIcon loading placeholder (gray rounded square). Seeding the same cache the
 * aliased package uses makes those glyphs render immediately.
 *
 * Icons are loaded via dynamic `import()` so Jest (which cannot parse the
 * optimize/es ESM graph) can import this module without transforming those paths.
 */
let seeded = false;

const isJest =
  typeof process !== 'undefined' &&
  (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');

export const ensureWorkflowGraphEuiIcons = (): void => {
  if (seeded || isJest) return;
  seeded = true;

  void (async () => {
    const [
      { appendIconComponentCache },
      { icon: at },
      { icon: boxesVertical },
      { icon: branch },
      { icon: checkCircleFill },
      { icon: chevronSingleDown },
      { icon: chevronSingleLeft },
      { icon: chevronSingleRight },
      { icon: code },
      { icon: copy },
      { icon: cross },
      { icon: ellipsis },
      { icon: info },
      { icon: minus },
      { icon: pencil },
      { icon: play },
      { icon: plus },
      { icon: plusCircle },
      { icon: question },
      { icon: refresh },
      { icon: share },
      { icon: tokenArray },
      { icon: tokenBoolean },
      { icon: tokenNumber },
      { icon: tokenObject },
      { icon: tokenString },
      { icon: trash },
      { icon: warning },
      { icon: workflow },
    ] = await Promise.all([
      import('@elastic/eui/optimize/es/components/icon/icon'),
      import('@elastic/eui/optimize/es/components/icon/assets/at'),
      import('@elastic/eui/optimize/es/components/icon/assets/boxes_vertical'),
      import('@elastic/eui/optimize/es/components/icon/assets/branch'),
      import('@elastic/eui/optimize/es/components/icon/assets/check_circle_fill'),
      import('@elastic/eui/optimize/es/components/icon/assets/chevron_single_down'),
      import('@elastic/eui/optimize/es/components/icon/assets/chevron_single_left'),
      import('@elastic/eui/optimize/es/components/icon/assets/chevron_single_right'),
      import('@elastic/eui/optimize/es/components/icon/assets/code'),
      import('@elastic/eui/optimize/es/components/icon/assets/copy'),
      import('@elastic/eui/optimize/es/components/icon/assets/cross'),
      import('@elastic/eui/optimize/es/components/icon/assets/ellipsis'),
      import('@elastic/eui/optimize/es/components/icon/assets/info'),
      import('@elastic/eui/optimize/es/components/icon/assets/minus'),
      import('@elastic/eui/optimize/es/components/icon/assets/pencil'),
      import('@elastic/eui/optimize/es/components/icon/assets/play'),
      import('@elastic/eui/optimize/es/components/icon/assets/plus'),
      import('@elastic/eui/optimize/es/components/icon/assets/plus_circle'),
      import('@elastic/eui/optimize/es/components/icon/assets/question'),
      import('@elastic/eui/optimize/es/components/icon/assets/refresh'),
      import('@elastic/eui/optimize/es/components/icon/assets/share'),
      import('@elastic/eui/optimize/es/components/icon/assets/token_array'),
      import('@elastic/eui/optimize/es/components/icon/assets/token_boolean'),
      import('@elastic/eui/optimize/es/components/icon/assets/token_number'),
      import('@elastic/eui/optimize/es/components/icon/assets/token_object'),
      import('@elastic/eui/optimize/es/components/icon/assets/token_string'),
      import('@elastic/eui/optimize/es/components/icon/assets/trash'),
      import('@elastic/eui/optimize/es/components/icon/assets/warning'),
      import('@elastic/eui/optimize/es/components/icon/assets/workflow'),
    ]);

    appendIconComponentCache({
      at,
      boxesVertical,
      branch,
      checkCircleFill,
      chevronSingleDown,
      chevronSingleLeft,
      chevronSingleRight,
      code,
      copy,
      cross,
      ellipsis,
      info,
      minus,
      pencil,
      play,
      plus,
      plusCircle,
      question,
      refresh,
      share,
      // FieldIcon glyphs used by the data-reference catalog / field editor.
      tokenArray,
      tokenBoolean,
      tokenNumber,
      tokenObject,
      tokenString,
      trash,
      warning,
      workflow,
    });
  })();
};
ensureWorkflowGraphEuiIcons();
