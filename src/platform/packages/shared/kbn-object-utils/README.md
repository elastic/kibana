# @kbn/object-utils

Utilities for objects manipulation and parsing.

## Utilities

### calculateObjectDiff

This utils compares two JSON objects and calculates the added and removed properties, including nested properties.

```ts
const oldObject = {
  alpha: 1,
  beta: {
    gamma: 2,
    delta: {
      sigma: 7,
    },
  },
};

const newObject = {
  alpha: 1,
  beta: {
    gamma: 2,
    eta: 4,
  },
};

const diff = calculateObjectDiff(oldObject, newObject);

/*
Result:
{
  added: {
    beta: {
      eta: 4,
    },
  },
  removed: {
    beta: {
      delta: {
        sigma: 7,
      },
    },
  },
  updated: {}
}
*/
```

### flattenObject

This utils returns a flattened version of the input object also accounting for nested properties.

```ts
const flattened = flattenObject({
  alpha: {
    gamma: {
      sigma: 1,
    },
    delta: {
      sigma: 2,
    },
  },
  beta: 3,
});

/*
Result:
{
  'alpha.gamma.sigma': 1,
  'alpha.delta.sigma': 2,
  beta: 3,
}
*/
```
