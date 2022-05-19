# @kbn/ecs-schema

Provides a Typescript definition of the ECS schema.

## Example usage
```js
const { ecsSchema } = require('@kbn/ecs-schema');
const service_address = ecsSchema.serviceEcs.address;
```

## How to update

1. Download the latest [ecs_nested.yml](https://github.com/elastic/ecs/raw/main/generated/ecs/ecs_nested.yml) artifact from ECS.
1. Replace the `ecs_nested.yml` in the `tmp/` directory.
1. `yarn kbn bootstrap`
1. `node packages/kbn-ecs-schema/src/scripts/run.js generate`
