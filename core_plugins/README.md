# Kibana Core Plugins

This folder contains all the Kibana core plugins. Each plugin is built on its
own, so it contains a separate `package.json` and build script, including a
separate TypeScript config — i.e. they are independent.

TODO: describe dev setup or link to eventual package we build that handles it

## Why are core plugins "independent"?

There are several reasons why we want to keep core plugins independent, e.g.:

- It forces us to treat internal and external plugins the same. They get the
  same access to Kibana apis, they get the same build treatment, etc. That means
  we treat external plugins as a true first-class citizen.
- Plugins definitely don't import into core Kibana.
- It's easier to track which packages are used where, as every plugin has its
  own `package.json`.

## How do I create a new core plugin?

TODO

## How granular should core plugins be?

TODO
