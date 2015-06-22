# ansi-styles [![Build Status](https://secure.travis-ci.org/sindresorhus/ansi-styles.png?branch=master)](http://travis-ci.org/sindresorhus/ansi-styles)

> ANSI escape codes for colorizing strings in the terminal.

You probably want the higher-level [chalk](https://github.com/sindresorhus/chalk) module for styling your strings.

![screenshot](screenshot.png)


## Install

Install with [npm](https://npmjs.org/package/ansi-styles): `npm install --save ansi-styles`


## Example

Generates the above screenshot.

```js
var ansi = require('ansi-styles');

console.log(ansi.green + 'Styles:' + ansi.reset + '\n');

Object.keys(ansi).forEach(function (el) {
	var style = ansi[el];

	if (/^bg[^B]/.test(el)) {
		style = ansi.black + style;
	}

	process.stdout.write(style + el + ansi.reset + ' ');
});
```


## Styles

### General

- reset
- bold
- italic
- underline
- blink
- inverse
- strikethrough

### Text colors

- black
- red
- green
- yellow
- blue
- magenta
- cyan
- white
- default
- gray

### Background colors

- bgBlack
- bgRed
- bgGreen
- bgYellow
- bgBlue
- bgMagenta
- bgCyan
- bgWhite
- bgDefault


## License

MIT License • © [Sindre Sorhus](http://sindresorhus.com)
