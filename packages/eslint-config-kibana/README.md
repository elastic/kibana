# eslint-config-kibana

The eslint config used by the kibana team

## Usage

To use this eslint config, just install the peer dependencies and reference it 
in your `.eslintrc`:

```javascript
{
  extends: [
    '@elastic/eslint-config-kibana'
  ]
}
```

## Optional jest config

If the project uses the [jest test runner](https://facebook.github.io/jest/), 
the `@elastic/eslint-config-kibana/jest` config can be extended as well to use 
`eslint-plugin-jest` and add settings specific to it:

```javascript
{
  extends: [
    '@elastic/eslint-config-kibana',
    '@elastic/eslint-config-kibana/jest'
  ]
}
```

## Optional prettier config

If the project wants to use [prettier](https://github.com/prettier/prettier), 
the `@elastic/eslint-config-kibana/prettier` config can be extended used:

```javascript
{
  extends: [
    '@elastic/eslint-config-kibana',
    '@elastic/eslint-config-kibana/prettier'
  ]
}
```
