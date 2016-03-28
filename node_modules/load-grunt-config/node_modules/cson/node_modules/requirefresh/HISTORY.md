# History

## v2.0.0 March 16, 2015
- Simplified the API
	- `require('requirefresh').requireFresh('the-module')` is now `require('requirefresh')('the-module')`
	- `require('requirefresh').requireFreshSafe('the-module', next)` is now `require('requirefresh').safe('the-module', next)`
- Removed domains from safe method, seemed out of scope to have them there (there is now just a try..catch)

## v1.1.2 August 30, 2011
- Learnt how to use finally in try catch finally (it runs even after returns!)

## v1.1.1 August 30, 2011
- Re-applied engines to be node 0.8 and above due to use of domains

## v1.1.0 August 30, 2011
- Split out into `requireFresh` and `requireFreshSafe`

## v1.0.1 August 30, 2011
- Updated engines to be node 0.8 and above due to use of domains

## v1.0.0 August 30, 2011
- Split from [bevry/safeps](https://github.com/bevry/safeps)
- Added domains to catch even more errors
