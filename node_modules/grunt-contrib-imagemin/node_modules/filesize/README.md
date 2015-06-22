[![build status](https://secure.travis-ci.org/avoidwork/filesize.js.png)](http://travis-ci.org/avoidwork/filesize.js)
# filesize.js

filesize.js provides a simple way to get a human readable file size string from a number (float or integer) or string.  An optional second parameter is the decimal place to round to (default is 2), or _true_ which triggers Unix style output. An optional third parameter lets you disable `bit` sizes, e.g. "kb".

## Examples

1.10.0 switched to base 10, all previous versions use base 2.

```javascript
filesize(500);                    // "4.00 Kb"
filesize(500, true);              // "4.0k"
filesize(1500);                   // "1.50 KB"
filesize("1500000000");           // "1.50 GB"
filesize("1500000000", 0);        // "2GB"
filesize(1212312421412412);       // "1.21 PB PB"
filesize(1212312421412412, true); // "1.1P" - shorthand output, similar to "ls -h"
filesize(265318, 2, false)        // "265.32 kB" - disabled `bit` sizes with third argument
```

## How can I load filesize.js?

filesize.js supports AMD loaders (require.js, curl.js, etc.), node.js & npm (npm install filesize), or using a script tag.

## Support

If you're having problems with using the project, use the support forum at CodersClan.

<a href="http://codersclan.net/forum/index.php?repo_id=11"><img src="http://www.codersclan.net/graphics/getSupport_blue_big.png" width="160"></a>

## License

filesize.js is licensed under BSD-3 https://raw.github.com/avoidwork/filesize.js/master/LICENSE

## Copyright

Copyright (c) 2013, Jason Mulligan <jason.mulligan@avoidwork.com>
