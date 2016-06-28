<!-- TITLE/ -->

<h1>Extract Options & Callback</h1>

<!-- /TITLE -->


<!-- BADGES/ -->

<span class="badge-travisci"><a href="http://travis-ci.org/bevry/extract-opts" title="Check this project's build status on TravisCI"><img src="https://img.shields.io/travis/bevry/extract-opts/master.svg" alt="Travis CI Build Status" /></a></span>
<span class="badge-npmversion"><a href="https://npmjs.org/package/extract-opts" title="View this project on NPM"><img src="https://img.shields.io/npm/v/extract-opts.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/extract-opts" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/extract-opts.svg" alt="NPM downloads" /></a></span>
<span class="badge-daviddm"><a href="https://david-dm.org/bevry/extract-opts" title="View the status of this project's dependencies on DavidDM"><img src="https://img.shields.io/david/bevry/extract-opts.svg" alt="Dependency Status" /></a></span>
<span class="badge-daviddmdev"><a href="https://david-dm.org/bevry/extract-opts#info=devDependencies" title="View the status of this project's development dependencies on DavidDM"><img src="https://img.shields.io/david/dev/bevry/extract-opts.svg" alt="Dev Dependency Status" /></a></span>
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

Extract the options and callback from a function's arguments easily

<!-- /DESCRIPTION -->


<!-- INSTALL/ -->

<h2>Install</h2>

<a href="https://npmjs.com" title="npm is a package manager for javascript"><h3>NPM</h3></a><ul>
<li>Install: <code>npm install --save extract-opts</code></li>
<li>Use: <code>require('extract-opts')</code></li></ul>

<a href="http://browserify.org" title="Browserify lets you require('modules') in the browser by bundling up all of your dependencies"><h3>Browserify</h3></a><ul>
<li>Install: <code>npm install --save extract-opts</code></li>
<li>Use: <code>require('extract-opts')</code></li>
<li>CDN URL: <code>//wzrd.in/bundle/extract-opts@3.2.0</code></li></ul>

<a href="http://enderjs.com" title="Ender is a full featured package manager for your browser"><h3>Ender</h3></a><ul>
<li>Install: <code>ender add extract-opts</code></li>
<li>Use: <code>require('extract-opts')</code></li></ul>

<!-- /INSTALL -->


## Usage

### JavaScript

``` javascript
var extractOptsAndCallback = require('extract-opts')
var log = console.log.bind(console)

// fs.readFile(filename, [options], callback)
var readFile = function(filename, opts, next){
	// Extract options and callback
	var args = extractOptsAndCallback(opts, next)
	opts = args[0]
	next = args[1]

	// Forward for simplicities sake
	require('fs').readFile(filename, opts, next)
}

// Test it
readFile('package.json', log)          // works with no options
readFile('package.json', null, log)    // works with null options
readFile('package.json', {next:log})   // works with just options
```

### CoffeeScript

``` coffeescript
extractOptsAndCallback = require('extract-opts')
log = console.log.bind(console)

# fs.readFile(filename, [options], callback)
readFile = (filename, opts, next) ->
	# Extract options and callback
	[opts, next] = extractOptsAndCallback(opts, next)

	# Forward for simplicities sake
	require('fs').readFile(filename, opts, next)

# Test it
readFile('package.json', log)          # works with no options
readFile('package.json', null, log)    # works with null options
readFile('package.json', {next:log})   # works with just options
```

### Configuration

Extract Options and Callback also supports a third argument for custom `configuration`.

You can use this third argument to customize the `completionCallbackNames` property that defaults to `['next']`.
This is useful if your completion callback has other names besides `next`.
Allowing you to do the following:

``` coffeescript
extractOptsAndCallback = (opts, next, config={}) ->
	config.completionCallbackNames ?= ['next', 'complete', 'done']
	return require('extract-opts')(opts, next, config)
log = console.log.bind(console)

# The readFile method as before

# Test it
readFile('package.json', {next:log})        # works the standard completion callback name
readFile('package.json', {complete:log})    # works with our custom compeltion callback name
readFile('package.json', {done:log})        # works with our custom compeltion callback name
```


<!-- HISTORY/ -->

<h2>History</h2>

<a href="https://github.com/bevry/extract-opts/blob/master/HISTORY.md#files">Discover the release history by heading on over to the <code>HISTORY.md</code> file.</a>

<!-- /HISTORY -->


<!-- CONTRIBUTE/ -->

<h2>Contribute</h2>

<a href="https://github.com/bevry/extract-opts/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /CONTRIBUTE -->


<!-- BACKERS/ -->

<h2>Backers</h2>

<h3>Maintainers</h3>

These amazing people are maintaining this project:

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/extract-opts/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/extract-opts">view contributions</a></li></ul>

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

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/extract-opts/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/extract-opts">view contributions</a></li>
<li><a href="http://seanfridman.com">Sean Fridman</a> — <a href="https://github.com/bevry/extract-opts/commits?author=sfrdmn" title="View the GitHub contributions of Sean Fridman on repository bevry/extract-opts">view contributions</a></li></ul>

<a href="https://github.com/bevry/extract-opts/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /BACKERS -->


<!-- LICENSE/ -->

<h2>License</h2>

Unless stated otherwise all works are:

<ul><li>Copyright &copy; 2013+ <a href="http://bevry.me">Bevry Pty Ltd</a></li>
<li>Copyright &copy; 2011+ <a href="http://balupton.com">Benjamin Lupton</a></li></ul>

and licensed under:

<ul><li><a href="http://spdx.org/licenses/MIT.html">MIT License</a></li></ul>

<!-- /LICENSE -->
