# History

## v3.0.2 September 18, 2015
- Updated dependencies to avoid duplicate CoffeeScript installations

## v3.0.1 March 16, 2015
- Fixed stdin support on Node 0.8

## v3.0.0 March 16, 2015
- Every function now also supports callbacks (2nd or 3rd argument)
- Errors will now always maintain their stacks where possible
- Simplified some aliases (b/c break)
	- Changed `stringify` to now accept the arguments you would expect `stringify(data, replacer, indent)`
	- Changed `parse` to delegate to `parseCSONString` instead of `parseString`
	- Changed `load` to delegate to `parseCSONFile` instead of `parseFile`
	- Removed `require` (it use to delegate to `requireFile`)
- Updated dependencies

## v2.0.0 February 6, 2015
- API has been rewritten to be more robust and simple
- CSON data is now parsed and stringified with the [cson-parser](https://www.npmjs.com/package/cson-parser) package
- CLI now supports stdin input
- Node v0.11 and IO.js support

## v1.6.2 December 11, 2014
- Updated dependencies

## v1.6.1 August 3, 2014
- Updated dependencies

## v1.6.0 May 17, 2014
- Updated dependencies
- Fixed error handling in certain conditions

## v1.5.0 February 8th, 2014
- Updated dependencies

## v1.4.5 October 31, 2013
- Updated dependencies

## v1.4.4 August 30, 2013
- Updated dependencies

## v1.4.3 August 30, 2013
- Better error handling when requiring a file that has syntax errors
- Fixed stringify of '{}' giving '{{}}' which is invalid
	- Closes [issue #21](https://github.com/bevry/cson/issues/21)

## v1.4.2 June 7, 2013
- Updated dependencies

## v1.4.1 March 16, 2013
- Added `npm-shrinkwrap.json` that ensures `js2coffee` uses `coffee-script` 1.4.0
- Updated dependencies

## v1.4.0 October 25, 2012
- Dropped require extensions following [CoffeeScript's lead](https://github.com/jashkenas/coffee-script/issues/2441)
	- If you still want them, add them to your application manually
- Updated dependencies
	- coffee-script 1.3.x to 1.4.x

## v1.3.0 September 1, 2012
- You can now use `require` to require CSON files
	- Thanks to [Linus G Thiel](https://github.com/linus) for [pull request #16](https://github.com/bevry/cson/pull/16)
- Drops node v0.4 support, min supported version now v0.6

## v1.2.3 September 1, 2012
- Fixed `json2cson` and `cson2json` binaries
	- Thanks to [Zhang Cheng](https://github.com/zhangcheng) for [pull request #15](https://github.com/bevry/cson/pull/15)

## v1.2.2 August 10, 2012
- Re-added markdown files to npm distribution as they are required for the npm website

## v1.2.1 July 16, 2012
- Fixed try surrounding a next callback

## v1.2.0 July 7, 2012
- CSON files are now sandboxed by default, ensuring they can't do bad stuff to your global scope
- Added `opts` as the middle argument for `parseFile`, `parseFileSync`, `parse`, and `parseSync` functions
	- You can use this to specify `sandbox: false` if you do not want sandboxing on CSON files

## v1.1.2 June 22, 2012
- We no longer have `require` cache our configuration files

## v1.1.1 June 21, 2012
- Fixed main file location

## v1.1.0 June 21, 2012
- Parsing file changes
	- If files have `js` or `coffee` extension, will try to require them
	- If files have `json` or `cson` extension, will try to read them
	- Otherwise will throw an unknown extension error
- Moved tests from Mocha to [Joe](https://github.com/bevry/joe)

## v1.0.2 May 04, 2012
- Fixed some CSON use cases and added more unit tests

## v1.0.1 May 04, 2012
- Async calls now act asynchronously
	- Thanks to [Ryan LeFevre](https://github.com/meltingice) for [pull request #10](https://github.com/bevry/cson/pull/10) -

## v1.0.0 April 23, 2012
- Updated tests
- Updated `package.json` for latest npm
- Cleaned up the code
- CoffeeScript dependency is now local
- Added synchronous API calls to the README
- Stringify functions now output CSON strings, instead of JSON strings
	- Use `JSON.stringify` if you want JSON strings
- Added `json2cson` and `cson2json` bin tools

## v0.2 August 10, 2011
- Added synchronous interface thanks to [clyfe](https://github.com/clyfe) - closes issue [#1](https://github.com/balupton/cson.npm/issues/1) and [#3](https://github.com/balupton/cson.npm/pull/3)

## v0.1 June 2, 2011
- Initial commit