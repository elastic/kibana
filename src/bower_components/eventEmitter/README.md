# EventEmitter

## Event based JavaScript for the browser

As the subtitle suggests, this script brings the power of events from platforms such as [node.js](http://nodejs.org/) to your browser. Although it can be used on any other platform, I just built it with browsers in mind.

This is actually the fourth full rewrite of EventEmitter, my aim is for it to be faster and lighter than ever before. It also has a remapped API which just makes a lot more sense. Because the methods now have more descriptive names it is friendlier to extension into other classes. You will be able to distinguish event method from your own methods.

I have been working on it for over ~~a year~~ two years so far and in that time my skills in JavaScript have come a long way. This script is a culmination of my learnings which you can hopefully find very useful.

## Dependencies

There are no hard dependencies. The only reason you will want to run `npm install` to grab the development dependencies is to build the documentation or minify the source code. No other scripts are required to actually use EventEmitter.

## Documentation

 * [Guide](https://github.com/Wolfy87/EventEmitter/blob/master/docs/guide.md)
 * [API](https://github.com/Wolfy87/EventEmitter/blob/master/docs/api.md)

### Examples

 * [Simple](http://jsfiddle.net/Wolfy87/qXQu9/)
 * [RegExp DOM caster](http://jsfiddle.net/Wolfy87/JqRvS/)

### Building the documentation

You can run `tools/doc.sh` to build from the JSDoc comments found within the source code. The built documentation will be placed in `docs/api.md`. I actually keep this inside the repository so each version will have it's documentation stored with it.

## Minifying

You can grab minified versions of EventEmitter from inside this repository, every version is tagged. If you need to build a custom version then you can run `tools/dist.sh`.

## Cloning

You can clone the repository with your generic clone commands as a standalone repository or submodule.

```bash
# Full repository
git clone git://github.com/Wolfy87/EventEmitter.git

# Or submodule
git submodule add git://github.com/Wolfy87/EventEmitter.git assets/js/EventEmitter
```

### Package managers

You can also get a copy of EventEmitter through the following package managers:
 * [NPM](https://npmjs.org/) (wolfy87-eventemitter)
 * [Bower](http://bower.io/) (eventEmitter)
 * [Component](http://github.com/component/component) (Wolfy87/EventEmitter)

## Testing

Tests are performed using [Mocha](http://visionmedia.github.io/mocha/) and [Chai](http://chaijs.com/) in the following browsers.

 * Firefox
 * Chrome
 * Opera
 * Safari
 * IE9+

When testing in the more modern browsers, I run it through the very early versions, some midrange versions and the very latest ones too. I don't just do the latest version.

EventEmitter will always be tested and working perfectly in all of them before a release. I will not release anything I think is riddled with bugs. However, if you do spot one, please [submit it as an issue](https://github.com/Wolfy87/EventEmitter/issues) and I will get right on it.

I had to stop testing in IE<9. This is because Jasmine no longer seems to work in old IE. I converted all of my tests to Mocha/Chai and then realised Chai doesn't work in IE<9 either. I know it works, I just can't run the tests anymore, I still recommend using it in older IE versions. However, if you do encounter problems, all you have to do is roll back before v4.1.0, the first IE9+ only tested version.

As consolation for the lack of legacy browser testing, I have made sure the examples listed above run perfectly in IE6+. So the unit tests might not be able to run, but I am **very** confident that it works absolutely perfectly.

## Contributing

If you wish to contribute to the project then please commit your changes into the `develop` branch. All pull requests should contain a failing test which is then resolved by your additions. [A perfect example](https://github.com/Wolfy87/EventEmitter/pull/46) was submitted by [nathggns](https://github.com/nathggns).

## License (MIT)

Copyright (c) 2011-2013 Oliver Caldwell

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
