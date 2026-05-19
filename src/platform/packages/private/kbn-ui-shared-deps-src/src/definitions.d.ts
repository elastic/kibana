/**
 * Absolute path to the distributable directory
 */
export const distDir: string;
/**
 * Filename of the main bundle file in the distributable directory
 */
export const jsFilename: "kbn-ui-shared-deps-src.js";
/**
 * Filename of the main bundle file in the distributable directory
 */
export const cssDistFilename: "kbn-ui-shared-deps-src.css";
/**
 * Externals mapping intended to be used in a webpack config
 */
export const externals: {
    /**
     * big deps which are locked to a single version
     */
    rxjs: string;
    numeral: string;
    '@elastic/numeral': string;
    '@elastic/charts': string;
    '@elastic/esql': string;
    '@elastic/esql/types': string;
    '@kbn/datemath': string;
    '@elastic/eui': string;
    '@elastic/eui/lib/components/provider/nested': string;
    '@elastic/eui/lib/services/theme/warning': string;
    '@elastic/eui-theme-borealis': string;
    '@hello-pangea/dnd': string;
    lodash: string;
    'lodash/fp': string;
    /**
     * runtime deps which don't need to be copied across all bundles
     */
    tslib: string;
    uuid: string;
    '@kbn/analytics': string;
    '@kbn/crypto-browser': string;
    '@kbn/es-query': string;
    '@kbn/search-errors': string;
    '@kbn/std': string;
    '@kbn/safer-lodash-set': string;
    '@kbn/shared-ux-error-boundary': string;
    '@kbn/rison': string;
    history: string;
    classnames: string;
    '@kbn/react-query': string;
    '@tanstack/react-query-devtools': string;
    '@kbn/code-editor': string;
    '@kbn/esql-language': string;
    '@kbn/ebt-tools': string;
    '@elastic/apm-rum-core': string;
    '@kbn/react-kibana-context-common': string;
    '@kbn/react-kibana-context-root': string;
    '@kbn/react-kibana-context-render': string;
    '@kbn/react-kibana-context-theme': string;
    '@kbn/react-kibana-context-env': string;
    '@kbn/shared-ux-router': string;
    '@kbn/react-kibana-mount': string;
    '@kbn/visualizations-common': string;
    '@kbn/core-di-browser': string;
    '@kbn/core-chrome-sidebar-context': string;
    '@kbn/core-chrome-browser-context': string;
    /**
     * stateful deps
     */
    '@kbn/ui-theme': string;
    '@kbn/i18n': string;
    '@kbn/i18n-react': string;
    '@emotion/cache': string;
    '@emotion/react': string;
    '@emotion/react/jsx-runtime': string;
    '@emotion/react/jsx-dev-runtime': string;
    jquery: string;
    moment: string;
    'moment-timezone': string;
    react: string;
    'react-dom': string;
    'react-dom/server': string;
    'react-router': string;
    'react-router-dom': string;
    'react-router-dom-v5-compat': string;
    'react-use': string;
    'styled-components': string;
    '@kbn/monaco': string;
    'monaco-editor/esm/vs/editor/editor.api': string;
    'fp-ts/Option': string;
    'fp-ts/pipeable': string;
    'fp-ts/TaskEither': string;
    'fp-ts/Either': string;
    'fp-ts/function': string;
    'fp-ts/Task': string;
    'fp-ts/Set': string;
    'fp-ts/Ord': string;
    'fp-ts/Array': string;
    'io-ts': string;
    'io-ts/lib/Reporter': string;
    'io-ts/lib/PathReporter': string;
    'io-ts/lib/ThrowReporter': string;
    'zod/v4': string;
    '@reduxjs/toolkit': string;
    'react-redux': string;
    redux: string;
    immer: string;
    reselect: string;
    'fastest-levenshtein': string;
    'chroma-js': string;
};
