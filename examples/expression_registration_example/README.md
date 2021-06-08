# Expression Registration Example

This plugin is intended to serve as an example of how to create a plugin to register functions and renderers to the expressions plugin. It registers a `demofunction` function and a `demo` type renderer to the `expressions` plugin and displays a simple expression that makes use of them. This should be a good starting point for anyone building a new plugin to add functionality to the `expressions` plugin. 

Plugins that are made exclusively to add to expressions should be prefixed with `expression`.  Examples `expression_shape`, `expression_reveal_image`


## Porting from Canvas

When porting existing functions and renderers from Canvas, here are some key things to watch out for

#### Prefer React Components
Some of the existing Canvas renderers do a lot of manual DOM manipulation. We prefer all of that logic be encapsulated in a React component, which is much easier to test via Jest and Storybook

#### ESLint
Some of the Canvas functions and renderers were built outside of our existing eslint config, so expect there to be ESLint errors (filenames not snake cased, etc) as they are moved over. These should be relatively simple to fix. 

#### Handlers
Canvas has extended the IInterpreterRenderHandlers interface to add additional handlers that we pass to our renderes.  This is going to prevent reuse across applications.  Any use of these extended methods should be changed to use the `event` method that is a part of IInterpreterRenderHandlers.  

```
// Non-standard handler
handlers.resize({height: 100, width: 150});

// Should become
handlers.event('resize', {height: 100, width: 150});
```




