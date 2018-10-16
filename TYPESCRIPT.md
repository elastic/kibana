## TypeScriptifying Kibana Tips

### Converting existing code

To convert existing code over to TypeScript:
1. rename the file from `.js` to either `.ts` (if there is no html or jsx in the file) or `.tsx` (if there is).
2. Ensure tslint is running and installed in the IDE of your choice.  There will usually be some linter errors after the file rename.
3. Auto-fix what you can. This will save you a lot of time! VSCode can be set to auto fix tslint errors when files are saved.

### How to fix common TypeScript errors

The first thing that will probably happen when you convert a `.js` file in our system to `.ts` is that some imports will be lacking types. 

#### EUI component is missing types

1. Check https://github.com/elastic/eui/issues/256 to see if they know it’s missing, if it’s not on there, add it.
2. Temporarily get around the issue by using a declared module and exporting the missing types with the most basic types available. Bonus points if you write a PR yourself to the EUI repo to add the types, but having them available back in Kibana will take some time, as a new EUI release will need to be generated, then that new release pointed to in Kibana.  Best, to make forward progress, to do a temporary workaround.

```ts
declare module '@elastic/eui' {
  export const EuiPopoverTitle: React.SFC<any>;
}

import { EuiPopoverTitle } from '@elastic/eui';
```

Note: I think this has the possibility to cause a conflict if you import another file which also declares the `@elastic/eui` module.  TODO: document what the best thing is to do if you hit this situation.

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
declare class Metadata {
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

If yarn doesn't find the module it may not have types.  For example, our `rison_node` package doesn't have types.

In this case the best thing to do is create a top level `types` folder and point to that in the tsconfig.  This is something we should set up for rison_node.  Infra team already handled this and added: `x-pack/plugins/infra/types/rison_node.d.ts` but other code uses it too and we need to pull it up.

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

In react proptypes, we often will just to `PropTypes.func`.  In TypeScript, a function is `() => void`, or you can more fully flesh it out, for example:

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

Using any is sometimes valid, but should rarely be used, even if to make quicker progress. Even `Object` is better than `any` if you aren't sure of an input parameter.

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


