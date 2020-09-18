# Embeddables

Embeddables are re-usable widgets that can be rendered in any environment or plugin. Developers can embed them directly in their plugin. End users can dynamically add them to any embeddable _containers_.

## Embeddable containers

Containers are a special type of embeddable that can contain nested embeddables. Embeddables can be dynamically added to embeddable _containers_. Currently only dashboard uses this interface.

## Examples

Many example embeddables are implemented and registered [here](https://github.com/elastic/kibana/tree/master/examples/embeddable_examples). They can be played around with and explored [in the Embeddable Explorer example plugin](https://github.com/elastic/kibana/tree/master/examples/embeddable_explorer). Just run kibana with

```
yarn start --run-examples
```

and navigate to the Embeddable explorer app.

There is also an example of rendering dashboard container outside of dashboard app [here](https://github.com/elastic/kibana/tree/master/examples/dashboard_embeddable_examples).

## Docs

[Embeddable docs, guides & caveats](./docs/README.md)

## Testing

Run unit tests

```shell
node scripts/jest embeddable
```
