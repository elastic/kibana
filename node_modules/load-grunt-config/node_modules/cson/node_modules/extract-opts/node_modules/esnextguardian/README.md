<!-- TITLE/ -->

<h1>ESNextGuardian</h1>

<!-- /TITLE -->


<!-- BADGES/ -->

<span class="badge-travisci"><a href="http://travis-ci.org/bevry/esnextguardian" title="Check this project's build status on TravisCI"><img src="https://img.shields.io/travis/bevry/esnextguardian/master.svg" alt="Travis CI Build Status" /></a></span>
<span class="badge-npmversion"><a href="https://npmjs.org/package/esnextguardian" title="View this project on NPM"><img src="https://img.shields.io/npm/v/esnextguardian.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/esnextguardian" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/esnextguardian.svg" alt="NPM downloads" /></a></span>
<span class="badge-daviddm"><a href="https://david-dm.org/bevry/esnextguardian" title="View the status of this project's dependencies on DavidDM"><img src="https://img.shields.io/david/bevry/esnextguardian.svg" alt="Dependency Status" /></a></span>
<span class="badge-daviddmdev"><a href="https://david-dm.org/bevry/esnextguardian#info=devDependencies" title="View the status of this project's development dependencies on DavidDM"><img src="https://img.shields.io/david/dev/bevry/esnextguardian.svg" alt="Dev Dependency Status" /></a></span>
<br class="badge-separator" />
<span class="badge-slackin"><a href="https://slack.bevry.me" title="Join this project's slack community"><img src="https://slack.bevry.me/badge.svg" alt="Slack community badge" /></a></span>
<span class="badge-patreon"><a href="http://patreon.com/bevry" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>
<span class="badge-gratipay"><a href="https://www.gratipay.com/bevry" title="Donate weekly to this project using Gratipay"><img src="https://img.shields.io/badge/gratipay-donate-yellow.svg" alt="Gratipay donate button" /></a></span>
<span class="badge-flattr"><a href="https://flattr.com/profile/balupton" title="Donate to this project using Flattr"><img src="https://img.shields.io/badge/flattr-donate-yellow.svg" alt="Flattr donate button" /></a></span>
<span class="badge-paypal"><a href="https://bevry.me/paypal" title="Donate to this project using Paypal"><img src="https://img.shields.io/badge/paypal-donate-yellow.svg" alt="PayPal donate button" /></a></span>
<span class="badge-bitcoin"><a href="https://bevry.me/bitcoin" title="Donate once-off to this project using Bitcoin"><img src="https://img.shields.io/badge/bitcoin-donate-yellow.svg" alt="Bitcoin donate button" /></a></span>
<span class="badge-wishlist"><a href="https://bevry.me/wishlist" title="Buy an item on our wishlist for us"><img src="https://img.shields.io/badge/wishlist-donate-yellow.svg" alt="Wishlist browse button" /></a></span>

<!-- /BADGES -->


<!-- DESCRIPTION/ -->

Load your ES6+ files if the user's environment supports it, otherwise gracefully fallback to your ES5 files.

<!-- /DESCRIPTION -->


## Why?

When ESNext (i.e. ES6+) files are used natively, you gain these benefits:

1. It is much easier for debugging as your are debugging your source code, not compiled code

2. Can be faster due to:

 	1. Polyfills having to work around native features by going the long way, which can be very slow (e.g. `() => {}` vs `function () {}.bind(this)`

	2. JavaScript engines are better able to optimise your code due to the source code maintaining the original intention better than the compiled code (e.g. `const` vs `var`)

	A detailed performance comparison can be found at [bevry/es6-benchmarks](https://github.com/bevry/es6-benchmarks).

However, unless you have absolute control over the environment in which your code runs, and are only making use of ECMAScript features that the target environment supports, then you simply can't always take advantage of these benefits.

Generally, this leaves the option of compiling your ESNext code down to ES5 code, and publishing only your ES5 code for consumption — which as indicated, is harder to debug and is often slower.

The other option is to publish your ESNext code and include a runtime polyfill, which increases the runtime footprint, and makes performance at runtime slower — and may break things if the polyfill functionality conflicts or changes from package to package or version to version.

Fortunately, unless you deliberately use unstable ESNext features, then you are merely using features that are already standardized and are already making their way into modern environments, to run exactly as intended. This means your can publish your code in ESNext today with expectations of it working in the environments of the future.

We can utilise this feature of ESNext to our advantage, by publishing both the ESNext code, as well as our compiled fallback ES5 code, we can publish code that will have many benefits in environments that supports it, and fallback to harder to debug slower code on environments that don't support the best. The best of both worlds. This is what ESNextGuardian makes easy for you.


## Usage

1. If you haven't already got setup with ES6+, you can do so by:

	1. Install [Babel](https://babeljs.io) as a development dependency:

		``` shell
		npm install --save-dev babel-cli
		```

    1. [Configure](http://babeljs.io/docs/plugins/preset-es2015/) Babel to compile ESNext to ES5:

        ``` shell
        npm install --save-dev babel-preset-es2015
        wget -N https://raw.githubusercontent.com/bevry/base/master/.babelrc
        ```

	1. Use this command to compile your ESNext files (inside an `esnext` directory) to ES5 files (inside a `es5` directory):

		``` shell
		./node_modules/.bin/babel esnext --out-dir es5
		```

		Optional: If you would like that command to run with `npm run-script compile` instead (which is a bit more streamlined), you can do so by adding it to your `package.json` file under `scripts` then `compile` like so:

		``` json
		{
			"scripts": {
				"compile": "./node_modules/.bin/babel esnext --out-dir es5"
			}
		}
		```

1. Install and add ESNextGuardian to your project's dependencies:

	``` shell
	npm install --save esnextguardian
	```

1. Create an `esnextguardian.js` file in the root of your project, containing the following, customising the paths to your desired ESNext and ES5 main files.

 	``` javascript
    // 2015 December 8
    // https://github.com/bevry/esnextguardian
    'use strict'
    module.exports = require('esnextguardian')(
    	require('path').join(__dirname, 'esnext', 'lib', 'index.js'),
    	require('path').join(__dirname, 'es5', 'lib', 'index.js'),
        require
    )
	```

	We pass `require` as the 3rd argument to ensure that the require setup/configuration/environment remains the same as the module calling ESNextGuardian, it can differ between modules.

    We use `require('path').join` with `__dirname` to ensure that debugging messages and stack traces are indicative of the module calling ESNextGuardian, as the relative paths alone do not provide enough to be useful for those use cases.

1. Make the following changes to your `package.json` file:

	``` json
	{
		"main": "./esnextguardian.js",
		"browser": "./es5/lib/index.js",
		"jspm": {
			"main": "./es5/lib/index.js"
		}
	}
	```

	This will use:

	- The ESNextGuardian script by default for cross-enviroment compatibility
    - The ES5 Script for:
        - [browserify](http://browserify.org/) (a CommonJS compiler that uses the [`browser` field](https://github.com/substack/node-browserify#browser-field))
        - [jspm](http://jspm.io) (an ES6 package manager that uses the [`jspm.main` field](https://github.com/jspm/registry/wiki/Configuring-Packages-for-jspm#prefixing-configuration))
            - jspm uses the ES5 Script as ESNext support in jspm has not been released yet, [details here](https://github.com/bevry/domain-browser/pull/7#issuecomment-160814333)

1. All done, you may now test and publish your package.

Notes:

- Node.js [does not support](https://twitter.com/balupton/status/671519915795345410) [ECMAScript Modules](https://babeljs.io/docs/learn-es2015/#modules) so if you want ESNextGuardian to be of any value, be sure to use [Node.js (CommonJS) Modules](https://nodejs.org/api/modules.html) exclusively in your modules.

    If you use [ESLint](http://eslint.org) you can set `ecmaFeatures.modules` to `false` in your [ESLint configuration](http://eslint.org/docs/user-guide/configuring) to help enforce this.

- If you don't want your git repository polluted with your ES5 compiled files, add your ES5 files to your `.gitignore` file, like so:

	```
	# Build Files
	es5/
	```

- The following environment boolean flags are available:

    - `DEBUG_ESNEXTGUARDIAN` when `true` will output relevant debug information regarding (it is recommended you enable this for your development environments):

        - If the ESNext script fails to load, the error message as to why will be outputted
        - If relative paths were provided to ESNextGuardian a non-fatal warning will be outputted
        - If the `require` argument was not provided to ESNextGuardian, a non-fatal warning will be outputted

    - `REQUIRE_ESNEXT` when `true` will only attempt to load the ESNext script

    - `REQUIRE_ES5` when `true` will only attempt to load the ES5 script


<!-- HISTORY/ -->

<h2>History</h2>

<a href="https://github.com/bevry/esnextguardian/blob/master/HISTORY.md#files">Discover the release history by heading on over to the <code>HISTORY.md</code> file.</a>

<!-- /HISTORY -->


<!-- CONTRIBUTE/ -->

<h2>Contribute</h2>

<a href="https://github.com/bevry/esnextguardian/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /CONTRIBUTE -->


<!-- BACKERS/ -->

<h2>Backers</h2>

<h3>Maintainers</h3>

These amazing people are maintaining this project:

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/esnextguardian/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/esnextguardian">view contributions</a></li></ul>

<h3>Sponsors</h3>

No sponsors yet! Will you be the first?

<span class="badge-patreon"><a href="http://patreon.com/bevry" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>
<span class="badge-gratipay"><a href="https://www.gratipay.com/bevry" title="Donate weekly to this project using Gratipay"><img src="https://img.shields.io/badge/gratipay-donate-yellow.svg" alt="Gratipay donate button" /></a></span>
<span class="badge-flattr"><a href="https://flattr.com/profile/balupton" title="Donate to this project using Flattr"><img src="https://img.shields.io/badge/flattr-donate-yellow.svg" alt="Flattr donate button" /></a></span>
<span class="badge-paypal"><a href="https://bevry.me/paypal" title="Donate to this project using Paypal"><img src="https://img.shields.io/badge/paypal-donate-yellow.svg" alt="PayPal donate button" /></a></span>
<span class="badge-bitcoin"><a href="https://bevry.me/bitcoin" title="Donate once-off to this project using Bitcoin"><img src="https://img.shields.io/badge/bitcoin-donate-yellow.svg" alt="Bitcoin donate button" /></a></span>
<span class="badge-wishlist"><a href="https://bevry.me/wishlist" title="Buy an item on our wishlist for us"><img src="https://img.shields.io/badge/wishlist-donate-yellow.svg" alt="Wishlist browse button" /></a></span>

<h3>Contributors</h3>

These amazing people have contributed code to this project:

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/esnextguardian/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/esnextguardian">view contributions</a></li></ul>

<a href="https://github.com/bevry/esnextguardian/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /BACKERS -->


<!-- LICENSE/ -->

<h2>License</h2>

Unless stated otherwise all works are:

<ul><li>Copyright &copy; 2015+ <a href="http://bevry.me">Bevry Pty Ltd</a></li></ul>

and licensed under:

<ul><li><a href="http://spdx.org/licenses/MIT.html">MIT License</a></li></ul>

<!-- /LICENSE -->
