/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
/**
 * Server-rendered Elastic logo used by the boot splash and the legacy
 * browser error screen (see `template.tsx`).
 *
 * The SVG below is an inlined copy of the `logoElastic` asset shipped by
 * `@elastic/eui` (the same one `<EuiLoadingElastic />` renders under the
 * hood):
 *
 *   - source asset:   @elastic/eui/src/components/icon/assets/logo_elastic.tsx
 *   - compiled copy:  @elastic/eui/lib/components/icon/assets/logo_elastic.js
 *   - loader styles:  @elastic/eui/src/components/loading/loading_elastic.styles.ts
 *
 * Combined with the staggered keyframes in `legacy_styles.css`
 * (`@keyframes kbnLoadingElastic`), the splash animates identically to
 * `<EuiLoadingElastic size="xxl" />`.
 *
 * If you ever need to refresh the markup, the unit test
 * `logo.test.tsx` ("stays byte-for-byte in sync with @elastic/eui
 * logoElastic") compares this copy against the live EUI asset and will
 * fail if EUI rebrands — re-copy the `<path>` elements from the source
 * above (preserving their order: the keyframes target each path via
 * `:nth-of-type`).
 *
 * We can't render the EUI component itself here: this template is sent
 * to the browser before any JS / Emotion has executed, so the splash
 * must be plain SSR-safe HTML + static CSS.
 *
 * The SVG is intentionally decorative (`aria-hidden`). The loading
 * announcement is owned by the wrapping `role="progressbar"` element in
 * `template.tsx`, matching how `EuiLoadingElastic` advertises itself to
 * assistive tech.
 */
export declare const Logo: FC;
