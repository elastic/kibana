<a name"0.12.0"></a>
## 0.12.0 (2015-07-16)


#### Bug Fixes

* Updating grunt-karma to use the new API interface from Karma ([5d1881c9](https://github.com/karma-runner/grunt-karma/commit/5d1881c9))
* ensure files passed to karma are flat ([6075d692](https://github.com/karma-runner/grunt-karma/commit/6075d692), closes [#142](https://github.com/karma-runner/grunt-karma/issues/142))


<a name"0.11.2"></a>
### 0.11.2 (2015-06-29)


#### Bug Fixes

* ensure files passed to karma are flat ([6075d692](https://github.com/karma-runner/grunt-karma/commit/6075d692), closes [#142](https://github.com/karma-runner/grunt-karma/issues/142))


<a name"0.11.1"></a>
### 0.11.1 (2015-06-19)


#### Bug Fixes

* Allow karma release candidate as peer dependency ([5cdb1844](https://github.com/karma-runner/grunt-karma/commit/5cdb1844))


<a name"0.11.0"></a>
## 0.11.0 (2015-05-28)


#### Bug Fixes

* Allow for karma.conf to be used correctly Now client config is only passed to ka ([15fee6f9](https://github.com/karma-runner/grunt-karma/commit/15fee6f9), closes [#119](https://github.com/karma-runner/grunt-karma/issues/119))
* Update dependencies ([002926f4](https://github.com/karma-runner/grunt-karma/commit/002926f4))
* Flatten files array. ([7fe05940](https://github.com/karma-runner/grunt-karma/commit/7fe05940), closes [#142](https://github.com/karma-runner/grunt-karma/issues/142)


<a name="0.10.1"></a>
### 0.10.1 (2015-01-09)


#### Bug Fixes

* **task:** allow files definition in karma.conf ([6accf230](https://github.com/karma-runner/grunt-karma/commit/6accf230ce3eb945627709cc80fe3eafc82b9944), closes [#134](https://github.com/karma-runner/grunt-karma/issues/134))


<a name="0.10.0"></a>
## 0.10.0 (2015-01-09)


#### Features

* **task:**
  * let Grunt do the file matching ([cb53deae](https://github.com/karma-runner/grunt-karma/commit/cb53deaef6da756be55e35c7d9fa57b84afda2ed))
  * process templates in the config ([a10aaa75](https://github.com/karma-runner/grunt-karma/commit/a10aaa7548267ab035f8f4689eb54b2ead9245ef))


# 0.9.0 (2014-09-04)

## Features
### conventional-changelog

* add conventional-changelog (72c67e3)

### karma-dependency

* Bump Karma depdency to ~0.9.2 (23a4f25)

###

* make configFile optional (cee07ab)




# 0.8.3
* Flatten `files` input (@cgross)

# 0.8.2
* Emergency fix: Don't pass anything to karma if no browsers are defined.

# 0.8.1
* Kill background child process on main process exit. (@trabianmatt)
* Fix passing `client.args` through the commandline.
* Actually override the browsers array.
* Set client default args.
* Merge `client.args` from all sources.

# 0.8.0
* Update to `karma@0.12.0`

#0.3.0
* changed name from gruntacular to grunt-karma

#0.2.0
* support config sharing via options property
* basic example/test suite
* slight refactor
* use latest testacular

#0.1.1
* initial version
* docs
