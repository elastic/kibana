# sudo-block [![Build Status](https://travis-ci.org/sindresorhus/sudo-block.svg?branch=master)](https://travis-ci.org/sindresorhus/sudo-block)

> Block users from running your app with root permissions

![](screenshot.png)


## Install

```sh
$ npm install --save sudo-block
```


## Usage

```js
var sudoBlock = require('sudo-block');

sudoBlock();
```


## API

### sudoBlock(message)

When a file containing this function is run with root permissions it will exit and show an error message telling the user how to fix the problem so they don't have to run it with `sudo`

#### message

Type: `string`

Accepts a custom message.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
