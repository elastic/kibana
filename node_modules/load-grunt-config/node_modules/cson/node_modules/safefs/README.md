<!-- TITLE/ -->

<h1>Safe FS</h1>

<!-- /TITLE -->


<!-- BADGES/ -->

<span class="badge-travisci"><a href="http://travis-ci.org/bevry/safefs" title="Check this project's build status on TravisCI"><img src="https://img.shields.io/travis/bevry/safefs/master.svg" alt="Travis CI Build Status" /></a></span>
<span class="badge-npmversion"><a href="https://npmjs.org/package/safefs" title="View this project on NPM"><img src="https://img.shields.io/npm/v/safefs.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/safefs" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/safefs.svg" alt="NPM downloads" /></a></span>
<span class="badge-daviddm"><a href="https://david-dm.org/bevry/safefs" title="View the status of this project's dependencies on DavidDM"><img src="https://img.shields.io/david/bevry/safefs.svg" alt="Dependency Status" /></a></span>
<span class="badge-daviddmdev"><a href="https://david-dm.org/bevry/safefs#info=devDependencies" title="View the status of this project's development dependencies on DavidDM"><img src="https://img.shields.io/david/dev/bevry/safefs.svg" alt="Dev Dependency Status" /></a></span>
<br class="badge-separator" />
<span class="badge-slackin"><a href="https://slack.bevry.me" title="Join this project's slack community"><img src="https://slack.bevry.me/badge.svg" alt="Slack community badge" /></a></span>
<span class="badge-patreon"><a href="http://patreon.com/bevry" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>
<span class="badge-gratipay"><a href="https://www.gratipay.com/bevry" title="Donate weekly to this project using Gratipay"><img src="https://img.shields.io/badge/gratipay-donate-yellow.svg" alt="Gratipay donate button" /></a></span>
<span class="badge-flattr"><a href="http://flattr.com/thing/344188/balupton-on-Flattr" title="Donate to this project using Flattr"><img src="https://img.shields.io/badge/flattr-donate-yellow.svg" alt="Flattr donate button" /></a></span>
<span class="badge-paypal"><a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&amp;hosted_button_id=QB8GQPZAH84N6" title="Donate to this project using Paypal"><img src="https://img.shields.io/badge/paypal-donate-yellow.svg" alt="PayPal donate button" /></a></span>
<span class="badge-bitcoin"><a href="https://bevry.me/bitcoin" title="Donate once-off to this project using Bitcoin"><img src="https://img.shields.io/badge/bitcoin-donate-yellow.svg" alt="Bitcoin donate button" /></a></span>
<span class="badge-wishlist"><a href="https://bevry.me/wishlist" title="Buy an item on our wishlist for us"><img src="https://img.shields.io/badge/wishlist-donate-yellow.svg" alt="Wishlist browse button" /></a></span>

<!-- /BADGES -->


<!-- DESCRIPTION/ -->

Stop getting EMFILE errors! Open only as many files as the operating system supports.

<!-- /DESCRIPTION -->


<!-- INSTALL/ -->

<h2>Install</h2>

<a href="https://npmjs.com" title="npm is a package manager for javascript"><h3>NPM</h3></a><ul>
<li>Install: <code>npm install --save safefs</code></li>
<li>Use: <code>require('safefs')</code></li></ul>

<!-- /INSTALL -->


## Usage

``` javascript
var safefs = require('safefs')
```

SafeFS uses [graceful-fs](https://npmjs.org/package/graceful-fs) to wrap all of the standard [file system](http://nodejs.org/docs/latest/api/all.html#all_file_system) methods to avoid EMFILE errors among other problems.

On-top of graceful-fs, SafeFS also adds additional wrapping on the following methods:

- `writeFile(path, data, options?, next)` - ensure the full path exists before writing to it
- `appendFile(path, data, options?, next)` -  ensure the full path exists before writing to it
- `mkdir(path, mode?, next)` - mode defaults to `0o777 & (~process.umask())`
- `unlink(path, next)` - checks if the file exists before removing it

SafeFS also define these additional methods:

- `ensurePath(path, options, next)` - ensure the full path exists, equivalent to unix's `mdir -p path`
- `getParentPathSync(path)` - returns the parent directory of the path


<!-- HISTORY/ -->

<h2>History</h2>

<a href="https://github.com/bevry/safefs/blob/master/HISTORY.md#files">Discover the release history by heading on over to the <code>HISTORY.md</code> file.</a>

<!-- /HISTORY -->


<!-- CONTRIBUTE/ -->

<h2>Contribute</h2>

<a href="https://github.com/bevry/safefs/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /CONTRIBUTE -->


<!-- BACKERS/ -->

<h2>Backers</h2>

<h3>Maintainers</h3>

These amazing people are maintaining this project:

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/safefs/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/safefs">view contributions</a></li></ul>

<h3>Sponsors</h3>

No sponsors yet! Will you be the first?

<span class="badge-patreon"><a href="http://patreon.com/bevry" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>
<span class="badge-gratipay"><a href="https://www.gratipay.com/bevry" title="Donate weekly to this project using Gratipay"><img src="https://img.shields.io/badge/gratipay-donate-yellow.svg" alt="Gratipay donate button" /></a></span>
<span class="badge-flattr"><a href="http://flattr.com/thing/344188/balupton-on-Flattr" title="Donate to this project using Flattr"><img src="https://img.shields.io/badge/flattr-donate-yellow.svg" alt="Flattr donate button" /></a></span>
<span class="badge-paypal"><a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&amp;hosted_button_id=QB8GQPZAH84N6" title="Donate to this project using Paypal"><img src="https://img.shields.io/badge/paypal-donate-yellow.svg" alt="PayPal donate button" /></a></span>
<span class="badge-bitcoin"><a href="https://bevry.me/bitcoin" title="Donate once-off to this project using Bitcoin"><img src="https://img.shields.io/badge/bitcoin-donate-yellow.svg" alt="Bitcoin donate button" /></a></span>
<span class="badge-wishlist"><a href="https://bevry.me/wishlist" title="Buy an item on our wishlist for us"><img src="https://img.shields.io/badge/wishlist-donate-yellow.svg" alt="Wishlist browse button" /></a></span>

<h3>Contributors</h3>

These amazing people have contributed code to this project:

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/safefs/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/safefs">view contributions</a></li>
<li><a href="https://www.linkedin.com/in/jagill/">James Gill</a> — <a href="https://github.com/bevry/safefs/commits?author=jagill" title="View the GitHub contributions of James Gill on repository bevry/safefs">view contributions</a></li>
<li><a href="http://seanfridman.com">Sean Fridman</a> — <a href="https://github.com/bevry/safefs/commits?author=sfrdmn" title="View the GitHub contributions of Sean Fridman on repository bevry/safefs">view contributions</a></li>
<li><a href="http://dontkry.com">Kyle Robinson Young</a> — <a href="https://github.com/bevry/safefs/commits?author=shama" title="View the GitHub contributions of Kyle Robinson Young on repository bevry/safefs">view contributions</a></li></ul>

<a href="https://github.com/bevry/safefs/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /BACKERS -->


<!-- LICENSE/ -->

<h2>License</h2>

Unless stated otherwise all works are:

<ul><li>Copyright &copy; 2013+ <a href="http://bevry.me">Bevry Pty Ltd</a></li>
<li>Copyright &copy; 2011-2012 <a href="http://balupton.com">Benjamin Lupton</a></li></ul>

and licensed under:

<ul><li><a href="http://spdx.org/licenses/MIT.html">MIT License</a></li></ul>

<!-- /LICENSE -->
