# Browserslist [![Build Status](https://travis-ci.org/ai/browserslist.svg)](https://travis-ci.org/ai/browserslist)

Get browser versions that match given criteria.
Useful for tools like [Autoprefixer].

You can select browsers by passing a string. This library will use Can I Use
data to return the appropriate list of all matching versions.

For example, the last version of each major browser and versions,
with a usage of over 5% in global usage statistics:

```js
browserslist('last 1 version, > 5%');
//=> ['and_chr 41', 'chrome 41', 'chrome 40', 'firefox 37', 'firefox 36',
//    'ie 11', 'ie_mob 11', 'ios_saf 8.1-8.3', 'opera 27', 'safari 8']
```

Browserslist will use browsers criterias from:

1. First argument.
2. `BROWSERSLIST` environment variable.
3. `browserslist` config file in current or parent directories.
4. If all methods will not give a result, Browserslist will use defaults:<br>
   `> 1%, last 2 versions, Firefox ESR, Opera 12.1`.

<a href="https://evilmartians.com/?utm_source=browserslist">
<img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt="Sponsored by Evil Martians" width="236" height="54">
</a>

[Autoprefixer]: https://github.com/postcss/autoprefixer

## Queries

You can specify the versions by queries (case insensitive):

* `last 2 versions`: the last 2 versions for each major browser.
* `last 2 Chrome versions`: the last 2 versions of Chrome browser.
* `> 5%`: versions selected by global usage statistics.
* `> 5% in US`: uses USA usage statistics. It accepts [two-letter country code].
* `Firefox > 20`: versions of Firefox newer than 20.
* `Firefox >= 20`: versions of Firefox newer than or equal to 20.
* `Firefox < 20`: versions of Firefox less than 20.
* `Firefox <= 20`: versions of Firefox less than or equal to 20.
* `Firefox ESR`: the latest [Firefox ESR] version.
* `iOS 7`: the iOS browser version 7 directly.

Blackberry and Android WebView will not be used in `last n versions`.
You should add them by name.

Browserslist works with separated versions of browsers. To use all versions
of some browsers you can use `Firefox > 0`, but it is a very bad way.

[two-letter country code]: http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements

## Browsers

Names are case insensitive:

* `Android` for Android WebView.
* `BlackBerry` or `bb` for Blackberry browser.
* `Chrome` for Google Chrome.
* `Firefox` or `ff` for Mozilla Firefox.
* `Explorer` or `ie` for Internet Explorer.
* `iOS` or `ios_saf` for iOS Safari.
* `Opera` for Opera.
* `Safari` for desktop Safari.
* `OperaMobile` or `op_mob` for Opera Mobile.
* `OperaMini` or `op_mini` for Opera Mini.
* `ChromeAndroid` or `and_chr` for Chrome for Android
  (mostly same as common `Chrome`).
* `FirefoxAndroid` or `and_ff` for Firefox for Android.
* `ExplorerMobile` or `ie_mob` for Internet Explorer Mobile.


## Usage

```js
var browserslist = require('browserslist');

// Your CSS/JS build tool code
var process = function (css, opts) {
    var browsers = browserslist(opts.browsers, { path: opts.file });
    // Your code to add features for selected browsers
}
```

If a list is missing, Browserslist will look for a config file.
You can provide a `path` option (that can be a file) to find the config file
relatively to it.

Queries can be a string `"> 5%, last 1 version"`
or an array `['> 5%', 'last 1 version']`.

## Config File

Browserslist’s config should be named `browserslist` and have browsers queries
split by a new line. You can write a comment after `#`:

```yaml
# Browsers that we support

> 1%
Last 2 versions
IE 8 # sorry
```

You can specify direct path to config by `config` option.
