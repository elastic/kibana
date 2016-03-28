<!-- TITLE/ -->

<h1>eachr</h1>

<!-- /TITLE -->


<!-- BADGES/ -->

<span class="badge-travisci"><a href="http://travis-ci.org/bevry/eachr" title="Check this project's build status on TravisCI"><img src="https://img.shields.io/travis/bevry/eachr/master.svg" alt="Travis CI Build Status" /></a></span>
<span class="badge-npmversion"><a href="https://npmjs.org/package/eachr" title="View this project on NPM"><img src="https://img.shields.io/npm/v/eachr.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/eachr" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/eachr.svg" alt="NPM downloads" /></a></span>
<span class="badge-daviddm"><a href="https://david-dm.org/bevry/eachr" title="View the status of this project's dependencies on DavidDM"><img src="https://img.shields.io/david/bevry/eachr.svg" alt="Dependency Status" /></a></span>
<span class="badge-daviddmdev"><a href="https://david-dm.org/bevry/eachr#info=devDependencies" title="View the status of this project's development dependencies on DavidDM"><img src="https://img.shields.io/david/dev/bevry/eachr.svg" alt="Dev Dependency Status" /></a></span>
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

Give eachr an item to iterate (array, object or map) and an iterator, then in return eachr gives iterator the value and key of each item, and will stop if the iterator returned false.

<!-- /DESCRIPTION -->


<!-- INSTALL/ -->

<h2>Install</h2>

<a href="https://npmjs.com" title="npm is a package manager for javascript"><h3>NPM</h3></a><ul>
<li>Install: <code>npm install --save eachr</code></li>
<li>Use: <code>require('eachr')</code></li></ul>

<a href="http://browserify.org" title="Browserify lets you require('modules') in the browser by bundling up all of your dependencies"><h3>Browserify</h3></a><ul>
<li>Install: <code>npm install --save eachr</code></li>
<li>Use: <code>require('eachr')</code></li>
<li>CDN URL: <code>//wzrd.in/bundle/eachr@3.1.1</code></li></ul>

<a href="http://enderjs.com" title="Ender is a full featured package manager for your browser"><h3>Ender</h3></a><ul>
<li>Install: <code>ender add eachr</code></li>
<li>Use: <code>require('eachr')</code></li></ul>

<!-- /INSTALL -->


## Usage

Eachr accepts an array, object, or map. The iterator is bound to the list, and receives three arguments: the value, key, and list.

``` javascript
// Prepare
const eachr = require('eachr')
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

```

<!-- HISTORY/ -->

<h2>History</h2>

<a href="https://github.com/bevry/eachr/blob/master/HISTORY.md#files">Discover the release history by heading on over to the <code>HISTORY.md</code> file.</a>

<!-- /HISTORY -->


<!-- CONTRIBUTE/ -->

<h2>Contribute</h2>

<a href="https://github.com/bevry/eachr/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /CONTRIBUTE -->


<!-- BACKERS/ -->

<h2>Backers</h2>

<h3>Maintainers</h3>

These amazing people are maintaining this project:

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/eachr/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/eachr">view contributions</a></li></ul>

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

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/eachr/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/eachr">view contributions</a></li>
<li><a href="www.seanfridman.com">Sean Fridman</a></li>
<li><a href="http://robloach.net">Rob Loach</a> — <a href="https://github.com/bevry/eachr/commits?author=RobLoach" title="View the GitHub contributions of Rob Loach on repository bevry/eachr">view contributions</a></li>
<li><a href="http://seanfridman.com">Sean Fridman</a> — <a href="https://github.com/bevry/eachr/commits?author=sfrdmn" title="View the GitHub contributions of Sean Fridman on repository bevry/eachr">view contributions</a></li></ul>

<a href="https://github.com/bevry/eachr/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /BACKERS -->


<!-- LICENSE/ -->

<h2>License</h2>

Unless stated otherwise all works are:

<ul><li>Copyright &copy; 2011+ <a href="http://bevry.me">Bevry Pty Ltd</a></li></ul>

and licensed under:

<ul><li><a href="http://spdx.org/licenses/MIT.html">MIT License</a></li></ul>

<!-- /LICENSE -->
