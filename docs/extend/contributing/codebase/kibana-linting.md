---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/kibana-linting.html
---

# Linting [kibana-linting]

A note about linting: We use [oxlint](https://oxc.rs/docs/guide/usage/linter) to check that the [styleguide](https://github.com/elastic/kibana/blob/main/STYLEGUIDE.mdx) is being followed. Rules are configured in [`.oxlint/`](https://github.com/elastic/kibana/tree/main/.oxlint) and loaded through [`oxlint.config.mjs`](https://github.com/elastic/kibana/blob/main/oxlint.config.mjs). It runs in a pre-commit hook and as a part of the tests, but most contributors integrate it with their code editors for real-time feedback.

Run `node scripts/lint [paths...]` to lint files (the whole repo when no paths are given), and add `--fix` to apply automatic fixes. Pass explicit files or directories; globs are not expanded.

For editor integration, install the Oxc extension for your editor. The [oxlint editor guide](https://oxc.rs/docs/guide/usage/linter/editors) lists the available extensions.

Another tool we use for enforcing consistent coding style is EditorConfig, which can be set up by installing a plugin in your editor that dynamically updates its configuration. Take a look at the [EditorConfig](http://editorconfig.org/#download) site to find a plugin for your editor, and browse our [`.editorconfig`](https://github.com/elastic/kibana/blob/main/.editorconfig) file to see what config rules we set up.


## Setup Guide for VS Code Users [_setup_guide_for_vs_code_users]

Install the [Oxc VS Code extension](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode). It reports oxlint errors as you type in JavaScript and TypeScript files. Oxlint does not discover `oxlint.config.mjs` automatically; bootstrap (`node scripts/update_vscode_config`) points the extension at it in your workspace settings:

```json
"oxc.configPath": "${workspaceFolder}/oxlint.config.mjs"
```

The extension can automatically fix trivial lint errors when you save a file by adding this line in your settings.

```json
"editor.codeActionsOnSave": {
   "source.fixAll.oxc": "always"
}
```

The ESLint extension is not needed; {{kib}} no longer runs ESLint.

## Formatting [_formatting]

Code formatting is handled by [oxfmt](https://oxc.rs/docs/guide/usage/formatter), not by oxlint. The configuration lives in [`.oxfmtrc.json`](https://github.com/elastic/kibana/blob/main/.oxfmtrc.json) and applies to JavaScript and TypeScript files only. Run `node scripts/oxfmt [paths...]` to format files, or `node scripts/oxfmt --check` to report unformatted files without changing them; CI runs the latter. When fixing lint errors from the command line, run `node scripts/lint --fix` first and `node scripts/oxfmt` second so the lint fixes get formatted.

Bootstrap also sets the Oxc extension as the default formatter for JavaScript and TypeScript in your workspace settings, so Prettier extensions don't reformat these files. For format-on-save, install the [Oxc VS Code extension](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) (other editors are covered in the [oxfmt editor guide](https://oxc.rs/docs/guide/usage/formatter/editors)) and enable it in your settings:

```json
"editor.formatOnSave": true
```

Avoid using the [`Prettier` extension/IDE plugin](https://prettier.io/) while maintaining the {{kib}} project. Its output differs from oxfmt's in places and it would format files that the project deliberately leaves untouched.

