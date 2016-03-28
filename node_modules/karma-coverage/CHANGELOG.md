<a name="0.5.1"></a>
## 0.5.1 (2015-08-28)


### Bug Fixes

* **preprocessor:** Change paths in windows to use backslash ([b0eecbe](https://github.com/karma-runner/karma-coverage/commit/b0eecbe)), closes [#178](https://github.com/karma-runner/karma-coverage/issues/178)
* **preprocessor:** Resolve all paths properly ([098182f](https://github.com/karma-runner/karma-coverage/commit/098182f)), closes [#65](https://github.com/karma-runner/karma-coverage/issues/65)



<a name="0.5.0"></a>
# 0.5.0 (2015-08-06)


### Bug Fixes

* **preprocessor:** use absolute paths ([27e0b09](https://github.com/karma-runner/karma-coverage/commit/27e0b09))



<a name"0.4.2"></a>
### 0.4.2 (2015-06-12)


#### Bug Fixes

* **preprocessor:** Use `_.contains` instead of `_.includes` to avoid braking with `lodash@2` ([411beb1f](https://github.com/karma-runner/karma-coverage/commit/411beb1f))


<a name"0.4.1"></a>
### 0.4.1 (2015-06-09)

#### Features

* **preprocessor:** Add sourcemap support ([de3b738b](https://github.com/karma-runner/karma-coverage/commit/de3b738b), closes [#109](https://github.com/karma-runner/karma-coverage/issues/109))
* **reporter:** add check coverage thresholds ([bc63b158](https://github.com/karma-runner/karma-coverage/commit/bc63b158), closes [#21](https://github.com/karma-runner/karma-coverage/issues/21))


<a name"0.4.0"></a>
## 0.4.0 (2015-06-09)


#### Bug Fixes

* Drop karma from peerDependencies ([eebcc989](https://github.com/karma-runner/karma-coverage/commit/eebcc989))
* do not dispose collectors before they are written ([9816cd14](https://github.com/karma-runner/karma-coverage/commit/9816cd14))
* reporter allow using a externally provided source cachere for reporters change ` ([781c126f](https://github.com/karma-runner/karma-coverage/commit/781c126f))
* watermarks are not passed to reporters ([a9044055](https://github.com/karma-runner/karma-coverage/commit/a9044055), closes [#143](https://github.com/karma-runner/karma-coverage/issues/143), [#144](https://github.com/karma-runner/karma-coverage/issues/144))
* when using browserify dont create source code caching ([50030df1](https://github.com/karma-runner/karma-coverage/commit/50030df1))


#### Breaking Changes

* Karma is no longer a `peerDependency` so it needs to be installed
manually. Ref https://github.com/karma-runner/integration-tests/issues/5 ([eebcc989](https://github.com/karma-runner/karma-coverage/commit/eebcc989))


<a name"0.3.1"></a>
### 0.3.1 (2015-06-09)


#### Bug Fixes

* skip directory creation when reporting to console ([42c9e0a8](https://github.com/karma-runner/karma-coverage/commit/42c9e0a8), closes [#24](https://github.com/karma-runner/karma-coverage/issues/24))


#### Features

* adding support for including all sources in coverage data ([18091753](https://github.com/karma-runner/karma-coverage/commit/18091753))


<a name"0.3.0"></a>
## 0.3.0 (2015-06-09)


#### Features

* **preprocessor:** free instrumenter ([626e7b0c](https://github.com/karma-runner/karma-coverage/commit/626e7b0c), closes [#101](https://github.com/karma-runner/karma-coverage/issues/101))


#### Breaking Changes

* Karma-coverage does not ship with additional instrumenter. You need to explicitly install the instrumenter you need.

Removed **Ibrik** instrumenter that need to be installed explicitly.

Quick list of known community instrumenters :
- [Ibrik](https://github.com/Constellation/ibrik) (CoffeeScript files instrumenter).
- [Ismailia](https://github.com/Spote/ismailia) (ES6 files instrumenter using Traceur).
- [Isparta](https://github.com/douglasduteil/isparta) (ES6 files instrumenter using 6to5).

 ([626e7b0c](https://github.com/karma-runner/karma-coverage/commit/626e7b0c))


<a name"0.2.7"></a>
### 0.2.7 (2015-06-09)


#### Bug Fixes

* add in-memory source code caching to support detail reports on compiled CoffeeSc ([c1e542a5](https://github.com/karma-runner/karma-coverage/commit/c1e542a5))


<a name"0.2.6"></a>
### 0.2.6 (2015-06-09)


#### Bug Fixes

* reporters can be configured individually ([adcb8e69](https://github.com/karma-runner/karma-coverage/commit/adcb8e69))


<a name"0.2.5"></a>
### 0.2.5 (2015-06-09)


#### Features

* new `subdir` option ([309dad4e](https://github.com/karma-runner/karma-coverage/commit/309dad4e))


<a name"0.2.4"></a>
### 0.2.4 (2015-06-09)


#### Bug Fixes

* optional option no longer trigger an error when omitted ([a2cdf569](https://github.com/karma-runner/karma-coverage/commit/a2cdf569))


<a name"0.2.3"></a>
### 0.2.3 (2015-06-09)


#### Features

* **config:** instrumenter override option ([ee3e68e8](https://github.com/karma-runner/karma-coverage/commit/ee3e68e8))


<a name"0.2.2"></a>
### 0.2.2 (2015-06-09)


#### Features

* update the dependencies ([77d73e2b](https://github.com/karma-runner/karma-coverage/commit/77d73e2b))


<a name"0.2.1"></a>
### 0.2.1 (2015-06-09)


#### Features

* update istanbul to 0.2.3, ibrik to 1.1.1 ([9064ec1e](https://github.com/karma-runner/karma-coverage/commit/9064ec1e))


<a name"0.2.0"></a>
## 0.2.0 (2015-06-09)


#### Features

* no longer write json unless configured ([1256fb8b](https://github.com/karma-runner/karma-coverage/commit/1256fb8b))


#### Breaking Changes

* No json coverage is generated by default. If you want that, please use `json` reporter:

```js
coverageReporter: {
  type: 'json'
}

// or with multiple reporters
coverageReporter: {
  reporters: [
    {type: 'html', dir: 'coverage'},
    {type: 'json', dir: 'coverage'},
  ]
}
```

 ([1256fb8b](https://github.com/karma-runner/karma-coverage/commit/1256fb8b))


<a name"0.1.5"></a>
### 0.1.5 (2015-06-09)


#### Bug Fixes

* use output dir per reporter ([dac46788](https://github.com/karma-runner/karma-coverage/commit/dac46788), closes [#42](https://github.com/karma-runner/karma-coverage/issues/42))


#### Features

* revert update istanbul ([5b8937ab](https://github.com/karma-runner/karma-coverage/commit/5b8937ab))
* update istanbul ([b696c3e3](https://github.com/karma-runner/karma-coverage/commit/b696c3e3))


<a name"0.1.4"></a>
### 0.1.4 (2015-06-09)


#### Features

* Update ibrik version to 1.0.1 ([b50f2d53](https://github.com/karma-runner/karma-coverage/commit/b50f2d53), closes [#39](https://github.com/karma-runner/karma-coverage/issues/39))


<a name"0.1.3"></a>
### 0.1.3 (2015-06-09)


#### Bug Fixes

* update to work with Karma 0.11 ([89c98177](https://github.com/karma-runner/karma-coverage/commit/89c98177))


#### Features

* update instanbul ([24126e72](https://github.com/karma-runner/karma-coverage/commit/24126e72))
* support coverage for coffee script ([9f802c1c](https://github.com/karma-runner/karma-coverage/commit/9f802c1c))
* log where the coverage reports are generated ([c9ef5c9f](https://github.com/karma-runner/karma-coverage/commit/c9ef5c9f))
* add a default config and normalize outputFile path ([027fa4fc](https://github.com/karma-runner/karma-coverage/commit/027fa4fc))


<a name"0.1.2"></a>
### 0.1.2 (2015-06-09)


<a name"0.1.1"></a>
### 0.1.1 (2015-06-09)


#### Bug Fixes

* update to work with Karma 0.11 ([b744d6f2](https://github.com/karma-runner/karma-coverage/commit/b744d6f2))


<a name"0.1.0"></a>
## 0.1.0 (2015-06-09)


<a name"0.0.5"></a>
### 0.0.5 (2015-06-09)


#### Bug Fixes

* delay collector disposal until all file writing has completed. ([75c4db0e](https://github.com/karma-runner/karma-coverage/commit/75c4db0e))


#### Features

* allow multiple report types ([4a9afb62](https://github.com/karma-runner/karma-coverage/commit/4a9afb62))


<a name"0.0.4"></a>
### 0.0.4 (2015-06-09)


#### Features

* do not preprocess files if coverage reporter is not used ([277a1ad9](https://github.com/karma-runner/karma-coverage/commit/277a1ad9), closes [#7](https://github.com/karma-runner/karma-coverage/issues/7))


<a name"0.0.3"></a>
### 0.0.3 (2015-06-09)


#### Bug Fixes

* handle no result ([5eca4882](https://github.com/karma-runner/karma-coverage/commit/5eca4882))


#### Features

* support coverage per spec ([385b6e1f](https://github.com/karma-runner/karma-coverage/commit/385b6e1f))


<a name"0.0.2"></a>
### 0.0.2 (2015-06-09)

* Initial release
