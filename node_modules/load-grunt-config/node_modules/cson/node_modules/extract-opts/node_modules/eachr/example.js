// Prepare
const eachr = require('./')
const arr = ['first', 'second', 'third']
const obj = {a: 'first', b: 'second', c: 'third'}
const map = new Map([['a', 'first'], ['b', 'second'], ['c', 'third']])
function iterator (value, key) {
	console.log({value: value, key: key})
	if ( value === 'second' ) {
		console.log('break')
		return false
	}
}

// Cycle Array
eachr(arr, iterator)
// {'value': 'first',  'key': 0}
// {'value': 'second', 'key': 1}
// break

// Cycle Object
eachr(obj, iterator)
// {'value': 'first',  'key': 'a'}
// {'value': 'second', 'key': 'b'}
// break

// Cycle Map
eachr(map, iterator)
// {'value': 'first',  'key': 'a'}
// {'value': 'second', 'key': 'b'}
// break
