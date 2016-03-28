# topo

Topological sorting with grouping support.

[![Build Status](https://secure.travis-ci.org/hapijs/topo.png)](http://travis-ci.org/hapijs/topo)

Lead Maintainer: [Devin Ivy](https://github.com/devinivy)

## Usage
```node
var Topo = require('topo');

var topo = new Topo();

topo.add('Nap', { after: ['breakfast', 'prep'] });

topo.add([
    'Make toast',
    'Pour juice'
], { before: 'breakfast', group: 'prep' });

topo.add('Eat breakfast', { group: 'breakfast' });

topo.nodes;        // ['Make toast', 'Pour juice', 'Eat breakfast', 'Nap']
```

### `Topo`
The `Topo` object is the container for topologically sorting a list of nodes with non-circular interdependencies.

#### `new Topo()`
Creates a new `Topo` object.

#### `topo.add(nodes, [options])`
Specifies an additional node or list of nodes to be topologically sorted where:
  - `nodes` - a mixed value or array of mixed values to be added as nodes to the topologically sorted list.
  - `options` - optional sorting information about the `nodes`:
    - `group` - a string naming the group to which `nodes` should be assigned.  The group name `'?'` is reserved.
    - `before` - a string or array of strings specifying the groups that `nodes` must precede in the topological sort.
    - `after` - a string or array of strings specifying the groups that `nodes` must succeed in the topological sort.

Returns an array of the topologically sorted nodes.

#### `topo.nodes`
An array of the topologically sorted nodes.  This list is renewed upon each call to [`topo.add()`](#topoaddnodes-options).
