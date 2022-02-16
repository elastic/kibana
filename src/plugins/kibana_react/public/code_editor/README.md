# Code Editor Component

This re-usable code editor component was built as a layer of abstraction on top of the [Monaco Code Editor](https://microsoft.github.io/monaco-editor/) (and the [React Monaco Editor component](https://github.com/react-monaco-editor/react-monaco-editor)). The goal of this component is to expose a set of the most-used, most-helpful features from Monaco in a way that's easy to use out of the box. If a use case requires additional features, this component still allows access to all other Monaco features.

This editor component allows easy access to:
* [Syntax highlighting (including custom language highlighting)](https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages)
* [Suggestion/autocompletion widget](https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-completion-provider-example)
* Function signature widget 
* [Hover widget](https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-hover-provider-example)

The Monaco editor doesn't automatically resize the editor area on window or container resize so this component includes a [resize detector](https://github.com/maslianok/react-resize-detector) to cause the Monaco editor to re-layout and adjust its size when the window or container size changes

## Storybook Examples
To run the `CodeEditor` Storybook, from the root kibana directory, run `yarn storybook kibana_react`

All stories for the component live in `code_editor.examples.tsx`