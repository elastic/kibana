# elastic-eslint-config-kibana

The eslint config used by the kibana team

## Usage

To use this eslint config, just install the peer dependencies and reference it 
in your `.eslintrc`:

```javascript
{
  extends: [
    '@kbn/eslint-config'
  ]
}
```

## Optional jest config

If the project uses the [jest test runner](https://facebook.github.io/jest/), 
the `@kbn/eslint-config/jest` config can be extended as well to use 
`eslint-plugin-jest` and add settings specific to it:

```javascript
{
  extends: [
    '@kbn/eslint-config',
    '@kbn/eslint-config/jest'
  ]
}
```
