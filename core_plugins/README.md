# Kibana Core Plugins

This folder contains all the Kibana core plugins. Each plugin is built on its
own, so it contains a separate `package.json` and build script, including a
separate TypeScript config — i.e. they are independent.

TODO: describe dev setup or link to eventual package we build that handles it

## Why are core plugins "independent"?

There are several reasons why we want to keep core plugins independent, e.g.:

- It forces us to treat internal and external plugins the same. They get the
  same access to Kibana APIs, they get the same build treatment, etc. That means
  we treat external plugins as true first-class citizens.
- Plugins can't import modules from the Kibana platform, e.g.
  `import x from '../../platform/x'`. The only way a plugin can receive anything
  from outside itself is by depending on it in its own `package.json` or have
  it injected from the Kibana platform (or Kibana plugins it depends on) when
  starting up.
- It's easier to track which packages are used where, as every plugin has its
  own `package.json`.

## How does TypeScript work for plugins?

TODO: Explain `@internal`

## How do I create a new core plugin?

TODO

## How granular should core plugins be?

TODO
