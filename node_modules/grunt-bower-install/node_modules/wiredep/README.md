# wiredep

Wire dependencies to your source code.


## Getting Started
Install the module with: `npm install wiredep --save`

```js
require('wiredep')({
  directory: 'the directory of your Bower packages.',
  bowerJson: 'your bower.json file contents.',
  ignorePath: 'optional path to ignore from the injected filepath.',
  htmlFile: 'the path to the HTML file to take control of.',
  jsPattern: 'default: <script src="{{filePath}}"></script>',
  cssPattern: 'default: <link rel="stylesheet" href="{{filePath}}" />',
  exclude: [ /jquery/, "bower_components/modernizr/modernizr.js" ]
});
```


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).


## License
Copyright (c) 2013 Stephen Sawchuk. Licensed under the MIT license.
