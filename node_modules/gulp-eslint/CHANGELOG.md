# Changelog

## 0.15.0

* Update dependencies
* Bump eslint dependency to ^0.24.0

## 0.14.0

* Bump eslint dependency to ^0.23.0
* Remove no-longer-needed code
* Fix project eslintrc syntax

## 0.13.2

* Remove dependency on through2 to address highWatermark overflow issue (#36)

## 0.13.1

* Update dependencies

## 0.13.0

* Bump eslint dependency to ^0.22.1

## 0.12.0

* Bump eslint dependency to 0.21.x

## 0.11.1

* tidying-up dependencies

## 0.11.0

* Improve code coverage
* Remove support for deprecated/legacy formatters

## 0.10.0

* Bump eslint dependency to 0.20.x

## 0.9.0

* Bump eslint dependency to 0.19.x

## 0.8.0

* Bump eslint dependency to 0.18.x

## 0.7.0

* Bump eslint dependency to 0.17.x

## 0.6.0

* Bump eslint dependency to 0.16.x

## 0.5.0

* Bump eslint dependency to 0.15.x

## 0.4.3

* Fix "rulePaths" typo

## 0.4.2

* Bump bufferstreams dependency to 1.x
* Fix wrong option handling (@Jakobo)

## 0.4.1

* Code refactoring

## 0.4.0

* Bump eslint dependency to 0.14.x
* Use Stream2 instead of older Stream

## 0.3.0

* Import filesystem-local config plugins
* Fix doc typo

## 0.2.2

* Upgraded eslint to 0.13.0
* Fix filesystem-local .eslintrc loading
* Fix filesystem-local .eslintignore loading
* Add failAfterError to fail at the end of the stream instead of the first error (works well with 'format' method)

## 0.2.1 (unreleased)

* Upgraded eslint to 0.11.0

## 0.2.0

* WAY overdue upgrade to eslint (^0.9.2)
* Use eslint's CLIEngine module to do most of the configuration work (yay!)
* Semi-Breaking Change: Remove gulpEslint.linter. Linting will occur with compatible, installed version of eslint.

## 0.1.8

* Use "dependencies" instead of "peerDependencies"
* Update .eslintrc to account for new eol-last rule in eslint 0.7.1
* Check for message.severity when evaluating messages in failOnError

## 0.1.7

* Open eslint dependency to future versions
* Cut out several unnecessary dependencies
* Declare eslint as a peer dependency to support variation in version
* Fix support for nodejs 0.11

## 0.1.6

* Update dependencies, include eslint 0.5.0
* Integrate eslint cli-config changes
  * Accept string array of environments to enable
  * Accept string array of globals ('key:boolean' or 'key')

## 0.1.5

* Do not format when there are no eslint'd files

## 0.1.4

* Update eslint version to 0.4.0

## 0.1.3

* Change default formatter to 'stylish'
* Add support for .eslintignore file
* Skip non-JS files to play well with multi-filetype streams
* Add "failOnError" method to stop streams when an eslint error has occurred
* Use gulp-util's PluginError
* Ignore shebangs in JS files

## 0.1.2

* Update eslint version to 0.3.0

## 0.1.1

* Update dependency versions
* Loosen version peer dependency on Gulp

## 0.1.0

* initial plugin

