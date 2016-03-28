[![Travis CI](https://travis-ci.org/TrySound/postcss-value-parser.svg)](https://travis-ci.org/TrySound/postcss-value-parser)

# postcss-value-parser

Transforms css values and at-rule params into the tree

## Usage

```js
var parser = require('postcss-value-parser');

/*{
    nodes: [
      type: 'function',
      value: 'rgba',
      nodes: [
        { type: 'word', value: '233' },
        { type: 'div', value: ',', before: '', after: ' ' },
        { type: 'word', value: '45' },
        { type: 'div', value: ',', before: '', after: ' ' },
        { type: 'word', value: '66' },
        { type: 'div', value: ',', before: ' ', after: '' },
        { type: 'word', value: '.5' }
      ]
    ]
  }*/
parser('rgba(233, 45, 66 ,.5)')
  .walk('rgba', function (fn) {
    var color = fn.filter(function (node) {
      return node.type === 'word';
    }); // [233, 45, 66, .5]
    fn.type = 'word';
    fn.value = convertToHex(color);
  })
  .toString();
  // #E92D42
```

### Prevent walking into function

```js
parser('url(some url) 50% 50%')
  .walk(function (node) {
    // Your code

    if(node.type === 'functon' && node.value === 'url') {
      return false;
    }
  })
  .toString();
```

## Node types

- `{ type: 'word', value: 'any' }`
- `{ type: 'string', value: 'string', quote: '"' || '\'' }`
- `{ type: 'div', value: '/' || ',' || ':', before: ' ', after: ' ' }`
- `{ type: 'space', value: ' ' }` space as a separator
- `{ type: 'function', value: 'name', nodes: [] }`

## API

```
var parser = require('postcss-value-parser');
```

### parser.unit(value)

Returns parsed value

```js
// .2rem
{
  number: '.2',
  unit: 'rem'
}
```

### parser.trim(nodes)

Trims space nodes (modifies original array and returns reference on it)

### parser.stringify(nodes)

Stringifies node and array of nodes

### var p = parser(value)

Returns parsed tree

### p.nodes

Root nodes list

### p.toString()

Stringify tree to the value

### p.walk([name, ]cb[, reverse])

- `name` value filter
- `cb(node, index, nodes)`
- `reverse` walk to the deepest functions firstly

# License

MIT © [Bogdan Chadkin](mailto:trysound@yandex.ru)
