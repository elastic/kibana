# Kibana Storybook

This package provides ability to add [Storybook](https://storybook.js.org/) to any Kibana plugin.

- [Kibana Storybook](#kibana-storybook)
  - [Setup Instructions](#setup-instructions)
  - [Customizing configuration](#customizing-configuration)
  - [Composite Storybook](#composite-storybook)

## Setup Instructions

- Add a `.storybook/main.js` configuration file to your plugin. For example, create a file at
  `src/plugins/<plugin>/.storybook/main.js`, with the following contents:

  ```js
  module.exports = require('@kbn/storybook').defaultConfig;
  ```

- Add your plugin alias to `src/dev/storybook/aliases.ts` config.
- Create sample Storybook stories. For example, in your plugin create a file at
  `src/plugins/<plugin>/public/components/hello_world/hello_world.stories.tsx` with
  the following [Component Story Format](https://storybook.js.org/docs/react/api/csf) contents:

  ```jsx
  import { MyComponent } from './my_component';

  export default {
    component: MyComponent,
    title: 'Path/In/Side/Navigation/ToComponent',
  };

  export function Example() {
    return <MyComponent />;
  }
  ```

- Launch Storybook with `yarn storybook <plugin>`, or build a static site with `yarn storybook --site <plugin>`.

## Customizing configuration

The `defaultConfig` object provided by the @kbn/storybook package should be all you need to get running, but you can
override this in your .storybook/main.js. Using [Storybook's configuration options](https://storybook.js.org/docs/react/configure/overview).

## Composite Storybook

The [composite directory](./composite) contains a Storybook configuration that is used to build a Storybook using [Storybook Composition](https://storybook.js.org/docs/react/workflows/storybook-composition). This can be ran and built with `yarn storybook composite` (with `--site` to build the static site.)

The URLs of the composite site are in [/src/dev/aliases.ts](/src/dev/aliases.ts),
