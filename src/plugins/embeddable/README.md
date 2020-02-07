# The Embeddable API V2

The Embeddable API's main goal is to have documented and standardized ways to share and exchange information and functionality across applications and plugins.

There are three main pieces of this infrastructure:
 - Embeddables & Containers
 - Actions
 - Triggers

## Embeddables & Containers

Embeddables are isolated, serializable, renderable widgets. A developer can hard code an embeddable inside their
application, or they can use some built in actions to allow users to dynamically add them to *containers*.

Containers are a special type of embeddable that can contain nested embeddables.

## Actions

Actions are pluggable pieces of functionality exposed to the user that take an embeddable as context, plus an optional action context.

## Triggers

Triggers are the way actions are connected to a user action. We ship with two default triggers, `CONTEXT_MENU_TRIGGER` and `APPLY_FILTER`.

Actions attached to the `CONTEXT_MENU_TRIGGER` will be displayed in supported embeddables context menu to the user. Actions attached to the `APPLY_FILTER` trigger will show up when any embeddable emits this trigger.

A developer can register new triggers that their embeddables, or external components, can emit (as long as they have an embeddable to pass along as context).

## Examples

Many examples can be viewed in the functionally tested `kbn_tp_embeddable_explorer` plugin, as well as the jest tested classes inside the `embeddable_api/public/test_samples` folder.

## Testing

Run unit tests

```shell
node scripts/jest embeddable_api
```
