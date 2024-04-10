# @kbn/code-editor-mock

This package exposes mock to help with testing components that are composed of the code editor, especially that the code editor leverages
specific browser APIs that are not available in jsdom (i.e. window.matchMedia, window.ResizeObserver).

#### How to use

This package exposes a mocked version of the code-editor named `MockedCodeEditor`. This component can be used by leveraging the default [mocking capabilities](https://jestjs.io/docs/manual-mocks#mocking-node-modules) for modules of jest. One might go about this by creating a directory at `__mocks__/@kbn/code-editor` within your package, and an index file in the afore created directory that exports a named declaration that references `MockedCodeEditor`, like so;


```ts

export { MockedCodeEditor as CodeEditor } from '@kbn/code-editor-mock';

```

Alternatively for single use within a specific test suite or in the case where a setup file is in use, one can simply add the included test helper that auto mocks `@kbn/code-editor`, like so;

```ts
import '@kbn/code-editor-mock/jest_helper';
```

When using this helper within a single test suite, this import declaration must be placed before the import declaration of the components that imports `@kbn/code-editor`.