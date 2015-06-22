# [AngularMotion](http://mgcrea.github.io/angular-motion) [![Build Status](https://secure.travis-ci.org/mgcrea/angular-motion.svg?branch=master)](http://travis-ci.org/#!/mgcrea/angular-motion) [![devDependency Status](https://david-dm.org/mgcrea/angular-motion/dev-status.svg)](https://david-dm.org/mgcrea/angular-motion#info=devDependencies)

[![Banner](http://mgcrea.github.io/angular-motion/images/snippet.png)](http://mgcrea.github.io/angular-motion)

AngularMotion is an animation starter-kit built for [AngularJS 1.2.0+](https://github.com/angular/angular.js).

It's a spin off from [AngularStrap](http://mgcrea.github.io/angular-strap) v2 release work.


## Documentation and examples

+ Check the [documentation](http://mgcrea.github.io/angular-motion) and [changelog](https://github.com/mgcrea/angular-motion/releases).



## Quick start

+ Include the required libraries (cdn/local)

>
``` html
<link rel="stylesheet" href="//rawgithub.com/mgcrea/angular-motion/master/dist/angular-motion.min.css">
<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.9/angular.min.js"></script>
<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.9/angular-animate.min.js"></script>
```

+ Inject the `ngAnimate` module into your app

>
``` javascript
angular.module('myApp', ['ngAnimate']);
```


## Developers

Clone the repo, `git clone git://github.com/mgcrea/angular-motion.git`, [download the latest release](https://github.com/mgcrea/angular-motion/zipball/master) or install with bower `bower install angular-motion --save`.

AngularMotion is tested with `karma` against the latest stable release of AngularJS.

>
    $ npm install grunt-cli --global
    $ npm install --dev
    $ grunt test

You can build the latest version using `grunt`.

>
    $ grunt build

You can quickly hack around (the docs) with:

>
    $ grunt serve



## Contributing

Please submit all pull requests the against master branch. If your unit test contains JavaScript patches or features, you should include relevant unit tests. Thanks!



## Authors

**Olivier Louvignes**

+ http://olouv.com
+ http://github.com/mgcrea



## Copyright and license

    The MIT License

    Copyright (c) 2012 Olivier Louvignes

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
