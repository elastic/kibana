# Kibana Storybook

This package provides ability to add [Storybook](https://storybook.js.org/) to any Kibana package or plugin.

- [Kibana Storybook](#kibana-storybook)
  - [Setup Instructions](#setup-instructions)
  - [Customizing configuration](#customizing-configuration)

## Setup Instructions

- Add a `.storybook/main.js` configuration file to your plugin. For example, create a file at
  `src/plugins/<plugin>/.storybook/main.js`, with the following contents:

  ```js
  module.exports = require('@kbn/storybook').defaultConfig;
  ```

- Add your plugin alias to the [`src/dev/storybook/aliases.ts` configuration file](/src/dev/storybook/aliases.ts).

- Create sample Storybook stories. For example, in your plugin create a file at
  `src/plugins/<plugin>/public/components/hello_world/hello_world.stories.tsx` with
  the following [Component Story Format](https://storybook.js.org/docs/api/csf) contents:

  ```jsx
  import type { Meta, StoryObj } from '@storybook/react';

  import { MyComponent } from './MyComponent';

  const meta = {
    component: MyComponent,
  } satisfies Meta<typeof MyComponent>;

  export default meta;
  type Story = StoryObj<typeof MyComponent>;

  export const Basic: Story = {};

  export const WithProp: Story = {
    args: {
      prop: "value"
    }
  };
  ```

- Launch Storybook with `yarn storybook <plugin>`, or build a static site with `yarn storybook --site <plugin>`.

## Customizing configuration

The `defaultConfig` object provided by the `@kbn/storybook` package should be all you need to get running, but you can
override this in your `.storybook/main.js`. Using [Storybook's configuration options](https://storybook.js.org/docs/configure).

You can also add a `manager.ts` file to customize various aspects of your Storybook. For example, to change the title and link of the Storybook sidebar, you could add:

```ts
addons.setConfig({
  theme: create({
    brandTitle: 'My Plugin',
    brandUrl: 'https://github.com/elastic/kibana/tree/main/src/plugins/my_plugin',
  }),
});
```

Refer to the [Storybook documentation](https://storybook.js.org/docs/configure/user-interface/features-and-behavior) for more information.
