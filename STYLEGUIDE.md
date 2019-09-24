# Kibana Style Guide

This guide applies to all development within the Kibana project and is
recommended for the development of all Kibana plugins.

- [Architecture](style_guides/architecture_style_guide.md)
- [JavaScript](style_guides/js_style_guide.md)
- [React](style_guides/react_style_guide.md)
- [SASS](https://elastic.github.io/eui/#/guidelines/sass) (maintained in EUI)
- [HTML](style_guides/html_style_guide.md)
- [API](style_guides/api_style_guide.md)
- [Accessibility](style_guides/accessibility_guide.md)

## Filenames

All filenames should use `snake_case`.

*Right:*
  - `src/kibana/index_patterns/index_pattern.js`

*Wrong:*
  - `src/kibana/IndexPatterns/IndexPattern.js`

## TypeScript vs JavaScript

Whenever possible, write code in TypeScript instead of JavaScript, especially if it's new code.  Check out [TYPESCRIPT.md](TYPESCRIPT.md) for help with this process.