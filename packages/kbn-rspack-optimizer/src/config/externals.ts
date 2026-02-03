/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExternalItem } from '@rspack/core';

/**
 * Get externals mapping for shared dependencies
 * These are provided by @kbn/ui-shared-deps-src at runtime
 */
export function getExternals(): Record<string, string> {
  return {
    // Stateful deps - must be singletons
    '@kbn/ui-theme': '__kbnSharedDeps__.KbnUiTheme',
    '@kbn/i18n': '__kbnSharedDeps__.KbnI18n',
    '@kbn/i18n-react': '__kbnSharedDeps__.KbnI18nReact',
    '@emotion/cache': '__kbnSharedDeps__.EmotionCache',
    '@emotion/react': '__kbnSharedDeps__.EmotionReact',
    // JSX runtime exports for SWC's importSource: '@emotion/react'
    '@emotion/react/jsx-runtime': '__kbnSharedDeps__.EmotionReactJsxRuntime',
    '@emotion/react/jsx-dev-runtime': '__kbnSharedDeps__.EmotionReactJsxDevRuntime',
    jquery: '__kbnSharedDeps__.Jquery',
    moment: '__kbnSharedDeps__.Moment',
    'moment-timezone': '__kbnSharedDeps__.MomentTimezone',
    react: '__kbnSharedDeps__.React',
    'react-dom': '__kbnSharedDeps__.ReactDom',
    'react-dom/server': '__kbnSharedDeps__.ReactDomServer',
    'react-router': '__kbnSharedDeps__.ReactRouter',
    'react-router-dom': '__kbnSharedDeps__.ReactRouterDom',
    'react-router-dom-v5-compat': '__kbnSharedDeps__.ReactRouterDomV5Compat',
    'react-use': '__kbnSharedDeps__.ReactUse',
    'styled-components': '__kbnSharedDeps__.StyledComponents',
    '@kbn/monaco': '__kbnSharedDeps__.KbnMonaco',
    'monaco-editor/esm/vs/editor/editor.api': '__kbnSharedDeps__.MonacoBarePluginApi',

    // fp-ts subpaths
    'fp-ts/Option': '__kbnSharedDeps__.FpTs.option',
    'fp-ts/pipeable': '__kbnSharedDeps__.FpTs.pipeable',
    'fp-ts/TaskEither': '__kbnSharedDeps__.FpTs.taskEither',
    'fp-ts/Either': '__kbnSharedDeps__.FpTs.either',
    'fp-ts/function': '__kbnSharedDeps__.FpTs.function',
    'fp-ts/Task': '__kbnSharedDeps__.FpTs.task',
    'fp-ts/Set': '__kbnSharedDeps__.FpTs.set',
    'fp-ts/Ord': '__kbnSharedDeps__.FpTs.ord',
    'fp-ts/Array': '__kbnSharedDeps__.FpTs.array',

    // io-ts
    'io-ts': '__kbnSharedDeps__.IoTs',
    'io-ts/lib/Reporter': '__kbnSharedDeps__.IoTsReporter',
    'io-ts/lib/PathReporter': '__kbnSharedDeps__.IoTsPathReporter',
    'io-ts/lib/ThrowReporter': '__kbnSharedDeps__.IoTsThrowReporter',

    // Redux
    '@reduxjs/toolkit': '__kbnSharedDeps__.ReduxjsToolkit',
    'react-redux': '__kbnSharedDeps__.ReactRedux',
    redux: '__kbnSharedDeps__.Redux',
    immer: '__kbnSharedDeps__.Immer',
    reselect: '__kbnSharedDeps__.Reselect',

    // Big deps - locked versions
    rxjs: '__kbnSharedDeps__.Rxjs',
    numeral: '__kbnSharedDeps__.ElasticNumeral',
    '@elastic/numeral': '__kbnSharedDeps__.ElasticNumeral',
    '@elastic/charts': '__kbnSharedDeps__.ElasticCharts',
    '@kbn/datemath': '__kbnSharedDeps__.KbnDatemath',
    '@elastic/eui': '__kbnSharedDeps__.ElasticEui',
    '@elastic/eui/lib/components/provider/nested':
      '__kbnSharedDeps__.ElasticEuiLibComponentsUseIsNestedEuiProvider',
    '@elastic/eui/lib/services/theme/warning': '__kbnSharedDeps__.ElasticEuiLibServicesThemeWarning',
    '@elastic/eui-theme-borealis': '__kbnSharedDeps__.ElasticEuiThemeBorealis',
    '@hello-pangea/dnd': '__kbnSharedDeps__.HelloPangeaDnd',
    lodash: '__kbnSharedDeps__.Lodash',
    'lodash/fp': '__kbnSharedDeps__.LodashFp',

    // Runtime deps
    tslib: '__kbnSharedDeps__.TsLib',
    uuid: '__kbnSharedDeps__.Uuid',
    '@kbn/analytics': '__kbnSharedDeps__.KbnAnalytics',
    '@kbn/crypto-browser': '__kbnSharedDeps__.KbnCryptoBrowser',
    '@kbn/es-query': '__kbnSharedDeps__.KbnEsQuery',
    '@kbn/search-errors': '__kbnSharedDeps__.KbnSearchErrors',
    '@kbn/std': '__kbnSharedDeps__.KbnStd',
    '@kbn/safer-lodash-set': '__kbnSharedDeps__.SaferLodashSet',
    '@kbn/shared-ux-error-boundary': '__kbnSharedDeps__.KbnSharedUxErrorBoundary',
    '@kbn/rison': '__kbnSharedDeps__.KbnRison',
    history: '__kbnSharedDeps__.History',
    classnames: '__kbnSharedDeps__.Classnames',
    '@kbn/react-query': '__kbnSharedDeps__.ReactQuery',
    '@tanstack/react-query-devtools': '__kbnSharedDeps__.ReactQueryDevtools',
    '@kbn/code-editor': '__kbnSharedDeps__.KbnCodeEditor',
    '@kbn/esql-language': '__kbnSharedDeps__.KbnEsqlAst',
    '@kbn/ebt-tools': '__kbnSharedDeps__.KbnEbtTools',
    '@elastic/apm-rum-core': '__kbnSharedDeps__.ElasticApmRumCore',
    '@kbn/react-kibana-context-common': '__kbnSharedDeps__.KbnReactKibanaContextCommon',
    '@kbn/react-kibana-context-root': '__kbnSharedDeps__.KbnReactKibanaContextRoot',
    '@kbn/react-kibana-context-render': '__kbnSharedDeps__.KbnReactKibanaContextRender',
    '@kbn/react-kibana-context-theme': '__kbnSharedDeps__.KbnReactKibanaContextTheme',
    '@kbn/react-kibana-context-env': '__kbnSharedDeps__.KbnReactKibanaContextEnv',
    '@kbn/shared-ux-router': '__kbnSharedDeps__.KbnSharedUxRouter',
    '@kbn/react-kibana-mount': '__kbnSharedDeps__.KbnReactKibanaMount',
    '@kbn/visualizations-common': '__kbnSharedDeps__.KbnVisualizationsCommon',
    'fastest-levenshtein': '__kbnSharedDeps__.FastestLevenshtein',
    'chroma-js': '__kbnSharedDeps__.ChromaJs',

    // react-use subpaths
    'react-use/lib/useAsync': '__kbnSharedDeps__.ReactUse.useAsync',
    'react-use/lib/useAsyncFn': '__kbnSharedDeps__.ReactUse.useAsyncFn',
    'react-use/lib/useDebounce': '__kbnSharedDeps__.ReactUse.useDebounce',
    'react-use/lib/useDeepCompareEffect': '__kbnSharedDeps__.ReactUse.useDeepCompareEffect',
    'react-use/lib/useEffectOnce': '__kbnSharedDeps__.ReactUse.useEffectOnce',
    'react-use/lib/useEvent': '__kbnSharedDeps__.ReactUse.useEvent',
    'react-use/lib/useLatest': '__kbnSharedDeps__.ReactUse.useLatest',
    'react-use/lib/useList': '__kbnSharedDeps__.ReactUse.useList',
    'react-use/lib/useLocalStorage': '__kbnSharedDeps__.ReactUse.useLocalStorage',
    'react-use/lib/useMount': '__kbnSharedDeps__.ReactUse.useMount',
    'react-use/lib/useMountedState': '__kbnSharedDeps__.ReactUse.useMountedState',
    'react-use/lib/usePrevious': '__kbnSharedDeps__.ReactUse.usePrevious',
    'react-use/lib/useSessionStorage': '__kbnSharedDeps__.ReactUse.useSessionStorage',
    'react-use/lib/useTimeoutFn': '__kbnSharedDeps__.ReactUse.useTimeoutFn',
    'react-use/lib/useToggle': '__kbnSharedDeps__.ReactUse.useToggle',
    'react-use/lib/useUnmount': '__kbnSharedDeps__.ReactUse.useUnmount',
    'react-use/lib/useUpdateEffect': '__kbnSharedDeps__.ReactUse.useUpdateEffect',

    // Node.js built-ins (for browser compatibility)
    'node:crypto': 'commonjs crypto',
  };
}
