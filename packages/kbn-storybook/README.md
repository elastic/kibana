# Kibana Storybook

This package provides ability to add [Storybook](https://storybook.js.org/) to any Kibana plugin.

- [Setup Instructions](#setup-instructions)


## Setup Instructions

1. Add `storybook.js` launcher file to your plugin. For example, create a file at
   `src/plugins/<plugin>/scripts/storybook.js`, with the following contents:

   ```js
   import { join } from 'path';

   // eslint-disable-next-line
   require('@kbn/storybook').runStorybookCli({
     name: '<plugin>',
     storyGlobs: [join(__dirname, '..', 'public', 'components', '**', '*.examples.tsx')],
   });
   ```
2. Add your plugin alias to `src/dev/storybook/aliases.ts` config.
3. Create sample Storybook stories. For example, in your plugin create create a file at
   `src/plugins/<plugin>/public/components/hello_world/__examples__/hello_world.examples.tsx` with
   the following contents:

   ```jsx
   import * as React from 'react';
   import { storiesOf } from '@storybook/react';

   storiesOf('Hello world', module).add('default', () => <div>Hello world!</div>);
   ```
4. Launch Storybook with `yarn storybook <plugin>`.
