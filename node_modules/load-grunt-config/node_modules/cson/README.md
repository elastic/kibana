<!-- TITLE/ -->

<h1>CSON</h1>

<!-- /TITLE -->


<!-- BADGES/ -->

<span class="badge-travisci"><a href="http://travis-ci.org/bevry/cson" title="Check this project's build status on TravisCI"><img src="https://img.shields.io/travis/bevry/cson/master.svg" alt="Travis CI Build Status" /></a></span>
<span class="badge-npmversion"><a href="https://npmjs.org/package/cson" title="View this project on NPM"><img src="https://img.shields.io/npm/v/cson.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/cson" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/cson.svg" alt="NPM downloads" /></a></span>
<span class="badge-daviddm"><a href="https://david-dm.org/bevry/cson" title="View the status of this project's dependencies on DavidDM"><img src="https://img.shields.io/david/bevry/cson.svg" alt="Dependency Status" /></a></span>
<span class="badge-daviddmdev"><a href="https://david-dm.org/bevry/cson#info=devDependencies" title="View the status of this project's development dependencies on DavidDM"><img src="https://img.shields.io/david/dev/bevry/cson.svg" alt="Dev Dependency Status" /></a></span>
<br class="badge-separator" />
<span class="badge-slackin"><a href="https://slack.bevry.me" title="Join this project's slack community"><img src="https://slack.bevry.me/badge.svg" alt="Slack community badge" /></a></span>
<span class="badge-patreon"><a href="http://patreon.com/bevry" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>
<span class="badge-gratipay"><a href="https://www.gratipay.com/bevry" title="Donate weekly to this project using Gratipay"><img src="https://img.shields.io/badge/gratipay-donate-yellow.svg" alt="Gratipay donate button" /></a></span>
<span class="badge-flattr"><a href="http://flattr.com/thing/344188/balupton-on-Flattr" title="Donate to this project using Flattr"><img src="https://img.shields.io/badge/flattr-donate-yellow.svg" alt="Flattr donate button" /></a></span>
<span class="badge-paypal"><a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&amp;hosted_button_id=QB8GQPZAH84N6" title="Donate to this project using Paypal"><img src="https://img.shields.io/badge/paypal-donate-yellow.svg" alt="PayPal donate button" /></a></span>
<span class="badge-bitcoin"><a href="https://bevry.me/bitcoin" title="Donate once-off to this project using Bitcoin"><img src="https://img.shields.io/badge/bitcoin-donate-yellow.svg" alt="Bitcoin donate button" /></a></span>
<span class="badge-wishlist"><a href="https://bevry.me/wishlist" title="Buy an item on our wishlist for us"><img src="https://img.shields.io/badge/wishlist-donate-yellow.svg" alt="Wishlist browse button" /></a></span>

<!-- /BADGES -->


CoffeeScript-Object-Notation. Same as JSON but for CoffeeScript objects.

[Projects using CSON.](https://www.npmjs.org/browse/depended/cson)

[Projects using CSON Parser directly.](https://www.npmjs.org/browse/depended/cson-parser)


<!-- INSTALL/ -->

<h2>Install</h2>

<a href="https://npmjs.com" title="npm is a package manager for javascript"><h3>NPM</h3></a><ul>
<li>Install: <code>npm install --save cson</code></li>
<li>Use: <code>require('cson')</code></li></ul>

<!-- /INSTALL -->


## What is CSON?

Everyone knows JSON, it's the thing that looks like this:

``` javascript
{
  "greatDocumentaries": [
    "earthlings.com",
    "forksoverknives.com",
    "cowspiracy.com"
  ],
  "importantFacts": {
    "emissions": "Livestock and their byproducts account for at least 32,000 million tons of carbon dioxide (CO2) per year, or 51% of all worldwide greenhouse gas emissions.\nGoodland, R Anhang, J. “Livestock and Climate Change: What if the key actors in climate change were pigs, chickens and cows?”\nWorldWatch, November/December 2009. Worldwatch Institute, Washington, DC, USA. Pp. 10–19.\nhttp://www.worldwatch.org/node/6294",
    "landuse": "Livestock covers 45% of the earth’s total land.\nThornton, Phillip, Mario Herrero, and Polly Ericksen. “Livestock and Climate Change.” Livestock Exchange, no. 3 (2011).\nhttps://cgspace.cgiar.org/bitstream/handle/10568/10601/IssueBrief3.pdf",
    "burger": "One hamburger requires 660 gallons of water to produce – the equivalent of 2 months’ worth of showers.\nCatanese, Christina. “Virtual Water, Real Impacts.” Greenversations: Official Blog of the U.S. EPA. 2012.\nhttp://blog.epa.gov/healthywaters/2012/03/virtual-water-real-impacts-world-water-day-2012/\n“50 Ways to Save Your River.” Friends of the River.\nhttp://www.friendsoftheriver.org/site/PageServer?pagename=50ways",
    "milk": "1,000 gallons of water are required to produce 1 gallon of milk.\n“Water trivia facts.” United States Environmental Protection Agency.\nhttp://water.epa.gov/learn/kids/drinkingwater/water_trivia_facts.cfm#_edn11",
    "more": "http://cowspiracy.com/facts"
  }
}
```

Now let's write the same thing in CSON:

``` coffeescript
# Comments!!!

# An Array with no commas!
greatDocumentaries: [
	'earthlings.com'
	'forksoverknives.com'
	'cowspiracy.com'
]

# An Object without braces!
importantFacts:
	# Multi-Line Strings! Without Quote Escaping!
	emissions: '''
		Livestock and their byproducts account for at least 32,000 million tons of carbon dioxide (CO2) per year, or 51% of all worldwide greenhouse gas emissions.
		Goodland, R Anhang, J. “Livestock and Climate Change: What if the key actors in climate change were pigs, chickens and cows?”
		WorldWatch, November/December 2009. Worldwatch Institute, Washington, DC, USA. Pp. 10–19.
		http://www.worldwatch.org/node/6294
		'''

	landuse: '''
		Livestock covers 45% of the earth’s total land.
		Thornton, Phillip, Mario Herrero, and Polly Ericksen. “Livestock and Climate Change.” Livestock Exchange, no. 3 (2011).
		https://cgspace.cgiar.org/bitstream/handle/10568/10601/IssueBrief3.pdf
		'''

	burger: '''
		One hamburger requires 660 gallons of water to produce – the equivalent of 2 months’ worth of showers.
		Catanese, Christina. “Virtual Water, Real Impacts.” Greenversations: Official Blog of the U.S. EPA. 2012.
		http://blog.epa.gov/healthywaters/2012/03/virtual-water-real-impacts-world-water-day-2012/
		“50 Ways to Save Your River.” Friends of the River.
		http://www.friendsoftheriver.org/site/PageServer?pagename=50ways
		'''

	milk: '''
		1,000 gallons of water are required to produce 1 gallon of milk.
		“Water trivia facts.” United States Environmental Protection Agency.
		http://water.epa.gov/learn/kids/drinkingwater/water_trivia_facts.cfm#_edn11
		'''

	more: 'http://cowspiracy.com/facts'
```

Which is far more lenient that JSON, way nicer to write and read, no need to quote and escape everything, has comments and readable multi-line strings, and won't fail if you forget a comma.



## Using CSON

### Via the Command Line

Use CSON with the command line with:

``` bash
# Convert a JSON file into a CSON file
json2cson in.json > out.cson
# Same thing via piping
cat in.json | json2cson > out.cson

# Convert a CSON file into a JSON file
cson2json in.cson > out.json
# Same thing via piping
cat in.cson | cson2json > out.json
```

Requires a global CSON install: `npm install -g cson`


### Via the API

Each method can be executed without a callback like so:

``` javascript
result = require('CSON').createCSONString({a:{b:'c'}}, {/* optional options argument */})
if ( result instanceof Error ) {
	console.log(result.stack)
} else {
	console.log(result)
}
```

Or via a callback like so:

``` javascript
CSON.createCSONString({a:{b:'c'}}, {/* optional options argument */}, function(err,result){
	console.log(err, result)
})
```

Executing the method with a callback still executes the method synchronously.

Click the below function names to open more detailed documentation.


#### Create Strings

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#stringify-instance'>
String <strong>CSON.stringify</strong>(data, replacer?, indent?)
</a> <br/> Converts an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a> into a CSON <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#createCSONString-instance'>
String <strong>CSON.createCSONString</strong>(data, opts?, next?)
</a> <br/> Converts an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a> into a CSON <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#createJSONString-instance'>
String <strong>CSON.createJSONString</strong>(data, opts?, next?)
</a> <br/> Converts an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a> into a JSON <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#createString-instance'>
String <strong>CSON.createString</strong>(data, opts?, next?)
</a> <br/> Converts an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a> into a <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a> of the desired format If the format option is not specified, we default to CSON


### Parse Strings

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parse-instance'>
Object <strong>CSON.parse</strong>(data, opts?, next?)
</a> <br/> Parses a CSON <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a> into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseCSONString-instance'>
Object <strong>CSON.parseCSONString</strong>(data, opts?, next?)
</a> <br/> Parses a CSON <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a> into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseJSONString-instance'>
Object <strong>CSON.parseJSONString</strong>(data, opts?, next?)
</a> <br/> Parses a JSON <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a> into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseCSString-instance'>
Object <strong>CSON.parseCSString</strong>(data, opts?, next?)
</a> <br/> Parses a CoffeeScript <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a> into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseJSString-instance'>
Object <strong>CSON.parseJSString</strong>(data, opts?, next?)
</a> <br/> Parses a JavaScript <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a> into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseString-instance'>
Object <strong>CSON.parseString</strong>(data, opts?, next?)
</a> <br/> Converts a <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String'>String</a> of the desired format into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a> If the format option is not specified, we default to CSON


#### Parse Files

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#load-instance'>
Object <strong>CSON.load</strong>(filePath, opts?, next?)
</a> <br/> Parses a CSON file into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseCSONFile-instance'>
Object <strong>CSON.parseCSONFile</strong>(filePath, opts?, next?)
</a> <br/> Parses a CSON file into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseJSONFile-instance'>
Object <strong>CSON.parseJSONFile</strong>(filePath, opts?, next?)
</a> <br/> Parses a JSON file into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseCSFile-instance'>
Object <strong>CSON.parseCSFile</strong>(filePath, opts?, next?)
</a> <br/> Parses a CoffeeScript file into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseJSFile-instance'>
Object <strong>CSON.parseJSFile</strong>(filePath, opts?, next?)
</a> <br/> Parses a JavaScript file into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#parseFile-instance'>
Object <strong>CSON.parseFile</strong>(filePath, opts?, next?)
</a> <br/> Parses a file path of the desired format into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a> If the format option is not specified, we use the filename to detect what it should be, otherwise we default to CSON


### Require Files

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#requireCSFile-instance'>
Object <strong>CSON.requireCSFile</strong>(filePath, opts?, next?)
</a> <br/> Requires a CoffeeScript file and returns the result <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#requireJSFile-instance'>
Object <strong>CSON.requireJSFile</strong>(filePath, opts?, next?)
</a> <br/> Requires a JavaScript file and returns the result <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a>

- <a href='http://rawgit.com/bevry/cson/master/docs/classes/CSON.html#requireFile-instance'>
Object <strong>CSON.requireFile</strong>(filePath, opts?, next?)
</a> <br/> Requires or parses a file path of the desired format into an <a href='https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object'>Object</a> If the format option is not specified, we use the filename to detect what it should be, otherwise we default to parsing CSON


<!-- HISTORY/ -->

<h2>History</h2>

<a href="https://github.com/bevry/cson/blob/master/HISTORY.md#files">Discover the release history by heading on over to the <code>HISTORY.md</code> file.</a>

<!-- /HISTORY -->


<!-- CONTRIBUTE/ -->

<h2>Contribute</h2>

<a href="https://github.com/bevry/cson/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /CONTRIBUTE -->


<!-- BACKERS/ -->

<h2>Backers</h2>

<h3>Maintainers</h3>

These amazing people are maintaining this project:

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/cson/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/cson">view contributions</a></li></ul>

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

<ul><li><a href="http://balupton.com">Benjamin Lupton</a> — <a href="https://github.com/bevry/cson/commits?author=balupton" title="View the GitHub contributions of Benjamin Lupton on repository bevry/cson">view contributions</a></li>
<li><a href="http://attilaolah.eu/">Attila Oláh</a> — <a href="https://github.com/bevry/cson/commits?author=attilaolah" title="View the GitHub contributions of Attila Oláh on repository bevry/cson">view contributions</a></li>
<li><a href="https://github.com/evinugur">evinugur</a> — <a href="https://github.com/bevry/cson/commits?author=evinugur" title="View the GitHub contributions of evinugur on repository bevry/cson">view contributions</a></li>
<li><a href="http://jasonkarns.com">Jason Karns</a> — <a href="https://github.com/bevry/cson/commits?author=jasonkarns" title="View the GitHub contributions of Jason Karns on repository bevry/cson">view contributions</a></li>
<li><a href="http://nerderati.com">Joël Perras</a> — <a href="https://github.com/bevry/cson/commits?author=jperras" title="View the GitHub contributions of Joël Perras on repository bevry/cson">view contributions</a></li>
<li><a href="http://yesbabyyes.se/">Linus Gustav Larsson Thiel</a> — <a href="https://github.com/bevry/cson/commits?author=linus" title="View the GitHub contributions of Linus Gustav Larsson Thiel on repository bevry/cson">view contributions</a></li>
<li><a href="https://github.com/nanuclickity">Tushar Kant</a> — <a href="https://github.com/bevry/cson/commits?author=nanuclickity" title="View the GitHub contributions of Tushar Kant on repository bevry/cson">view contributions</a></li>
<li><a href="https://github.com/clyfe">Claudius Nicolae</a> — <a href="https://github.com/bevry/cson/commits?author=clyfe" title="View the GitHub contributions of Claudius Nicolae on repository bevry/cson">view contributions</a></li>
<li><a href="http://robloach.net">Rob Loach</a> — <a href="https://github.com/bevry/cson/commits?author=RobLoach" title="View the GitHub contributions of Rob Loach on repository bevry/cson">view contributions</a></li>
<li><a href="http://meltingice.net">Ryan LeFevre</a> — <a href="https://github.com/bevry/cson/commits?author=meltingice" title="View the GitHub contributions of Ryan LeFevre on repository bevry/cson">view contributions</a></li>
<li><a href="https://github.com/Zearin">Zearin</a> — <a href="https://github.com/bevry/cson/commits?author=Zearin" title="View the GitHub contributions of Zearin on repository bevry/cson">view contributions</a></li>
<li><a href="http://about.me/zhangcheng77">ZHANG Cheng</a> — <a href="https://github.com/bevry/cson/commits?author=zhangcheng" title="View the GitHub contributions of ZHANG Cheng on repository bevry/cson">view contributions</a></li></ul>

<a href="https://github.com/bevry/cson/blob/master/CONTRIBUTING.md#files">Discover how you can contribute by heading on over to the <code>CONTRIBUTING.md</code> file.</a>

<!-- /BACKERS -->


<!-- LICENSE/ -->

<h2>License</h2>

Unless stated otherwise all works are:

<ul><li>Copyright &copy; 2012+ <a href="http://bevry.me">Bevry Pty Ltd</a></li>
<li>Copyright &copy; <a href="http://balupton.com">Benjamin Lupton</a></li></ul>

and licensed under:

<ul><li><a href="http://spdx.org/licenses/MIT.html">MIT License</a></li></ul>

<!-- /LICENSE -->