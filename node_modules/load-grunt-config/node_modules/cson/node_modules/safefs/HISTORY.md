# History

## v4.0.1 2015 December 10
- Updated internal conventions

## v4.0.0 2015 September 5
- Dropped node <0.12 support

## v3.2.2 2015 September 5
- Use any version of `graceful-fs` to fix possible compat issues with node <0.10 support

## v3.2.1 2015 September 5
- Fixed node <0.10 support (regression since v3.2.0)
	- Unfortunately our dev dependencies don't support this early, so no travis ci tests, manual tests pass

## v3.2.0 2015 September 5
- Moved from CoffeeScript to ES6+
- Removed `cyclic.js` as it should no longer be needed
- Added tests... finally...

## v3.1.3 2015 March 18
- Updated dependencies

## v3.1.2 2014 December 12
- Updated dependencies

## v3.1.1 2014 February 5
- Safefs no longer fails to extend the safefs object with fs utilities under certain environments
	- Thanks to [Merrick Christensen](https://github.com/iammerrick) and [Kyle Robinson Young](https://github.com/shama) for [issue #3](https://github.com/bevry/safefs/issues/3)

## v3.1.0 2013 December 9
- We no longer use our internal queue and now just rely on the graceful-fs queue
- We now alias all the other standard file system methods onto our own object

## v3.0.6 2013 November 25
- Only unlink if the file exists

## v3.0.5 2013 November 17
- Use [graceful-fs](https://github.com/isaacs/node-graceful-fs) under the hood, along with our limiting abilities to help avoid even more problems
- Updated dependencies

## v3.0.4 2013 November 6
- Repackaged
- Updated dependencies

## v3.0.3 2013 August 29
- Added `lstat` functions
	 - Thanks to [James Gill](https://github.com/jagill) for [pull request #1](https://github.com/bevry/safefs/pull/1)

## v3.0.2 2013 August 29
- Updated dependencies

## v3.0.1 2013 April 5
- Updated dependencies

## v3.0.0 2013 April 5
- Rewrote to use [TaskGroup](https://npmjs.org/package/taskgroup) instead of the manual queue + setTimeout approach we were using before

## v2.0.3 2013 April 1
- Added missing `ensurePath` and `getParentPathSync`

## v2.0.2 2013 April 1
- Added missing `ensurePath` and `getParentPathSync`

## v2.0.1 2013 March 29
- Fixed readme code block

## v2.0.0 2013 March 29
- Split from [bal-util](https://github.com/balupton/bal-util)
