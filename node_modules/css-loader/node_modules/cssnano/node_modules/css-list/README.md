> [Deprecated] Use postcss-value-parser instead

# css-list [![Build Status](https://travis-ci.org/TrySound/css-list.svg)](https://travis-ci.org/TrySound/css-list)
css parsing helpers

## API

If `separators` is not specified, it will default to
`[' ', '\n', '\t', ',', '/']`.

### list.each(input[, separators], cb)

```js
list.each('"50%" 50%/100% calc(100% + 20%)', [' ', '/'], function (value, type) {
	// "50%" quote
	// 50% null
	// 100% null
	// calc(100% + 20%) func
});
```

### list.map(input[, separators], cb)

```js
list.map('"50%" 50%/100% calc(100% + 20%)', [' ', '/'], function (value, type, prevValue, prevType) {
	if(type === 'func' || type === 'quote') {
		return type;
	}
});
// quote 50%/100% func
```

### list.split(input[, separators], last)

```js
// space
list.split('10px 20px 5px 15px')', ['\n', '\t', ' '])
// ['10px', '20px', '5px', '15px']
```

```js
// comma
list.split('10px, 20px, 5px, ')', [','], true)
// ['10px', '20px', '5px', '']
```
