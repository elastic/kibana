/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// `@elastic/eui` does not ship `.d.ts` files for its deep `lib/components/icon/assets/*`
// modules. We import `logo_elastic` from `logo.test.tsx` solely to compare its rendered
// SVG against our SSR-safe copy in `logo.tsx` (drift guard). This ambient declaration
// gives TypeScript just enough to type that import without resorting to `@ts-expect-error`.
declare module '@elastic/eui/test-env/components/icon/assets/logo_elastic' {
  export const icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}
