## TypeScriptifying Kibana Tips

### Converting existing code

To convert existing code over to TypeScript:
1. rename the file from `.js` to either `.ts` (if there is no html or jsx in the file) or `.tsx` (if there is).
2. Ensure eslint is running and installed in the IDE of your choice.  There will usually be some linter errors after the file rename.
3. Auto-fix what you can. This will save you a lot of time! VSCode can be set to auto fix eslint errors when files are saved.

### How to fix common TypeScript errors

The first thing that will probably happen when you convert a `.js` file in our system to `.ts` is that some imports will be lacking types.

#### EUI component is missing types

1. Check https://github.com/elastic/eui/issues/256 to see if they know it’s missing, if it’s not on there, add it.
2. Temporarily get around the issue by adding the missing type in the `typings/@elastic/eui/index.d.ts` file. Bonus points if you write a PR yourself to the EUI repo to add the types, but having them available back in Kibana will take some time, as a new EUI release will need to be generated, then that new release pointed to in Kibana.  Best, to make forward progress, to do a temporary workaround.

```ts
// typings/@elastic/eui/index.d.ts

declare module '@elastic/eui' {
  // Add your types here
  export const EuiPopoverTitle: React.FC<EuiPopoverTitleProps>;
  ...
}
```

```ts
// you can now import it in <your-plugin-file.ts>

import { EuiPopoverTitle } from '@elastic/eui';
```

Some background on the differences between module declaration and augmentation:

In TypeScript module declarations can not be merged, which means each module can only be declared once. But it is possible to augment previously declared modules. The documentation about the distinction between module declaration and augmentation is sparse. The observed rules for `declare module '...' {}` in a `.d.ts` file seem to be:

* it is treated as a module declaration when the file itself is not a module
* it is treated as a module augmentation when the file itself is module

A `.d.ts` file is treated as a module if it contains any top-level `import` or `export` statements. That means that in order to write a module declaration the `import`s must be contained within the `declare` block and none must be located on the topmost level. Conversely, to write a module augmentation there must be at least one top-level `import` or `export` and the `declare` block must not contain any `import` statements.

Since `@elastic/eui` already ships with a module declaration, any local additions must be performed using module augmentation, e.g.

```typescript
// file `typings/@elastic/eui/index.d.ts`

import { CommonProps } from '@elastic/eui';
import { FC } from 'react';

declare module '@elastic/eui' {
  export type EuiNewComponentProps = CommonProps & {
    additionalProp: string;
  };
  export const EuiNewComponent: FC<EuiNewComponentProps>;
}
```

#### Internal dependency is missing types.

1. Open up the file and see how easy it would be to convert to TypeScript.
2. If it's very straightforward, go for it.
3. If it's not and you wish to stay focused on your own PR, get around the error by adding a type definition file in the same folder as the dependency, with the same name.
4. Minimally you will need to type what you are using in your PR.  No need to go crazy to fully type the thing or you might be there for awhile depending on what's available.

For example:

metadata.js:
```js
export let metadata = null;

export function __newPlatformInit__(legacyMetadata) {
  ...
}
```

documentation_links.js:
```js
import { metadata } from './metadata';

export const DOC_LINK_VERSION = metadata.branch;
```

To TypeScript `documentation_links.js` you'll need to add a type definition for `metadata.js`

metadata.d.ts
```
declare interface Metadata {
  public branch: string;
}

declare const metadata: Metadata;

export { metadata };
```

#### External dependency is missing types

1. See if types exist for this module and can be installed, by doing something like:

`yarn add -D @types/markdown-it@8.4.1`

Use the version number that we have installed in package.json. This may not always work, and you might get something like:

`Please choose a version of "@types/markdown-it" from this list:`

If that happens, just pick the closest one.

If yarn doesn't find the module it may not have types.  For example, our `rison_node` package doesn't have types. In this case you have a few options:

1. Contribute types into the DefinitelyTyped repo itself, or
2. Create a top level `types` folder and point to that in the tsconfig. For example, Infra team already handled this for `rison_node` and added: `x-pack/legacy/plugins/infra/types/rison_node.d.ts`. Other code uses it too so we will need to pull it up. Or,
3. Add a `// @ts-ignore` line above the import. This should be used minimally, the above options are better. However, sometimes you have to resort to this method.

### TypeScripting react files

React has it's own concept of runtime types via `proptypes`. TypeScript gives you compile time types so I prefer those.

Before:
```jsx

import PropTypes from 'prop-types';

 export class Button extends Component {
   state = {
     buttonWasClicked = false
   };

   render() {
     return <button onClick={() => setState({ buttonWasClicked: true })}>{this.props.text}</button>
   }
 }

 Button.proptypes = {
  text: PropTypes.string,
 }
```

After:
```tsx

interface Props {
  text: string;
}

interface State {
  buttonWasClicked: boolean;
}

 export class Button extends Component<Props, State> {
   state = {
     buttonWasClicked = false
   };

   render() {
     return <button onClick={() => setState({ buttonWasClicked: true })}>{this.props.text}</button>
   }
 }
```

Note that the name of `Props` and `State` doesn't matter, the order does.  If you are exporting those interfaces to be used elsewhere, you probably should give them more fleshed out names, such as `ButtonProps` and `ButtonState`.

### Typing functions

In react proptypes, we often will use `PropTypes.func`.  In TypeScript, a function is `() => void`, or you can more fully flesh it out, for example:

- `(inputParamName: string) => string`
- `(newLanguage: string) => void`
- `() => Promise<string>`

### Typing destructured object parameters

Especially since we often use the spread operator, this syntax is a little different and probably worth calling out.

Before:
```js
function ({ title, description }) {
  ...
}
```

After:
```ts
function ({ title, description }: {title: string, description: string}) {
  ...
}

or, use an interface

interface Options {
  title: string;
  description: string;
}

function ({ title, description }: Options) {
  ...
}
```

## Use `any` as little as possible

Using any is sometimes valid, but should rarely be used, even if to make quicker progress. Even `Unknown` is better than using `any` if you aren't sure of an input parameter.

If you use a variable that isn't initially defined, you should give it a type or it will be `any` by default (and strangely this isn't a warning, even though I think it should be)

Before - `color` will be type `any`:
```js
let color;

if (danger) {
  color = 'red';
} else {
  color = 'green';
}
```

After - `color` will be type `string`:
```ts
let color: string;

if (danger) {
  color = 'red';
} else {
  color = 'green';
}
```

Another quirk, default `Map\WeakMap\Set` constructors use any-based type signature like `Map<any, any>\WeakMap<any, any>\Set<any>`. That means that TS won't complain about the piece of code below:

```ts
const anyMap = new Map();
anyMap.set('1', 2);
anyMap.set('2', '3');
anyMap.set(3, '4');

const anySet = new Set();
anySet.add(1);
anySet.add('2');
```

So we should explicitly define types for default constructors whenever possible:
```ts
const typedMap = new Map<string, number>();
typedMap.set('1', 2);
typedMap.set('2', '3'); // TS error
typedMap.set(3, '4'); // TS error

const typedSet = new Set<number>();
typedSet.add(1);
typedSet.add('2'); // TS error
```
