<a name="0.2.13"></a>
### 0.2.13 (2014-11-20)

This release primarily fixes issues reported against 0.2.12

#### Bug Fixes

* **$state:** fix $state.includes/.is to apply param types before comparisions fix(uiSref): ma ([19715d15](https://github.com/angular-ui/ui-router/commit/19715d15e3cbfff724519e9febedd05b49c75baa), closes [#1513](https://github.com/angular-ui/ui-router/issues/1513))
  * Avoid re-synchronizing from url after .transitionTo ([b267ecd3](https://github.com/angular-ui/ui-router/commit/b267ecd348e5c415233573ef95ebdbd051875f52), closes [#1573](https://github.com/angular-ui/ui-router/issues/1573))
* **$urlMatcherFactory:**
  * Built-in date type uses local time zone ([d726bedc](https://github.com/angular-ui/ui-router/commit/d726bedcbb5f70a5660addf43fd52ec730790293))
  * make date type fn check .is before running ([aa94ce3b](https://github.com/angular-ui/ui-router/commit/aa94ce3b86632ad05301530a2213099da73a3dc0), closes [#1564](https://github.com/angular-ui/ui-router/issues/1564))
  * early binding of array handler bypasses type resolution ([ada4bc27](https://github.com/angular-ui/ui-router/commit/ada4bc27df5eff3ba3ab0de94a09bd91b0f7a28c))
  * add 'any' Type for non-encoding non-url params ([3bfd75ab](https://github.com/angular-ui/ui-router/commit/3bfd75ab445ee2f1dd55275465059ed116b10b27), closes [#1562](https://github.com/angular-ui/ui-router/issues/1562))
  * fix encoding slashes in params ([0c983a08](https://github.com/angular-ui/ui-router/commit/0c983a08e2947f999683571477debd73038e95cf), closes [#1119](https://github.com/angular-ui/ui-router/issues/1119))
  * fix mixed path/query params ordering problem ([a479fbd0](https://github.com/angular-ui/ui-router/commit/a479fbd0b8eb393a94320973e5b9a62d83912ee2), closes [#1543](https://github.com/angular-ui/ui-router/issues/1543))
* **ArrayType:**
  * specify empty array mapping corner case ([74aa6091](https://github.com/angular-ui/ui-router/commit/74aa60917e996b0b4e27bbb4eb88c3c03832021d), closes [#1511](https://github.com/angular-ui/ui-router/issues/1511))
  * fix .equals for array types ([5e6783b7](https://github.com/angular-ui/ui-router/commit/5e6783b77af9a90ddff154f990b43dbb17eeda6e), closes [#1538](https://github.com/angular-ui/ui-router/issues/1538))
* **Param:** fix default value shorthand declaration ([831d812a](https://github.com/angular-ui/ui-router/commit/831d812a524524c71f0ee1c9afaf0487a5a66230), closes [#1554](https://github.com/angular-ui/ui-router/issues/1554))
* **common:** fixed the _.filter clone to not create sparse arrays ([750f5cf5](https://github.com/angular-ui/ui-router/commit/750f5cf5fd91f9ada96f39e50d39aceb2caf22b6), closes [#1563](https://github.com/angular-ui/ui-router/issues/1563))
* **ie8:** fix calls to indexOf and filter ([dcb31b84](https://github.com/angular-ui/ui-router/commit/dcb31b843391b3e61dee4de13f368c109541813e), closes [#1556](https://github.com/angular-ui/ui-router/issues/1556))


#### Features

* add json parameter Type ([027f1fcf](https://github.com/angular-ui/ui-router/commit/027f1fcf9c0916cea651e88981345da6f9ff214a))


<a name="0.2.12"></a>
### 0.2.12 (2014-11-13)

#### Bug Fixes

* **$resolve:** use resolve fn result, not parent resolved value of same name ([67f5e00c](https://github.com/angular-ui/ui-router/commit/67f5e00cc9aa006ce3fe6cde9dff261c28eab70a), closes [#1317], [#1353])
* **$state:**
  * populate default params in .transitionTo. ([3f60fbe6](https://github.com/angular-ui/ui-router/commit/3f60fbe6d65ebeca8d97952c05aa1d269f1b7ba1), closes [#1396])
  * reload() now reinvokes controllers ([73443420](https://github.com/angular-ui/ui-router/commit/7344342018847902594dc1fc62d30a5c30f01763), closes [#582])
  * do not emit $viewContentLoading if notify: false ([74255feb](https://github.com/angular-ui/ui-router/commit/74255febdf48ae082a02ca1e735165f2c369a463), closes [#1387](https://github.com/angular-ui/ui-router/issues/1387))
  * register states at config-time ([4533fe36](https://github.com/angular-ui/ui-router/commit/4533fe36e0ab2f0143edd854a4145deaa013915a))
  * handle parent.name when parent is obj ([4533fe36](https://github.com/angular-ui/ui-router/commit/4533fe36e0ab2f0143edd854a4145deaa013915a))
* **$urlMatcherFactory:**
  * register types at config ([4533fe36](https://github.com/angular-ui/ui-router/commit/4533fe36e0ab2f0143edd854a4145deaa013915a), closes [#1476])
  * made path params default value "" for backwards compat ([8f998e71](https://github.com/angular-ui/ui-router/commit/8f998e71e43a0b31293331c981f5db0f0097b8ba))
  * Pre-replace certain param values for better mapping ([6374a3e2](https://github.com/angular-ui/ui-router/commit/6374a3e29ab932014a7c77d2e1ab884cc841a2e3))
  * fixed ParamSet.$$keys() ordering ([9136fecb](https://github.com/angular-ui/ui-router/commit/9136fecbc2bfd4fda748a9914f0225a46c933860))
  * empty string policy now respected in Param.value() ([db12c85c](https://github.com/angular-ui/ui-router/commit/db12c85c16f2d105415f9bbbdeb11863f64728e0))
  * "string" type now encodes/decodes slashes ([3045e415](https://github.com/angular-ui/ui-router/commit/3045e41577a8b8b8afc6039f42adddf5f3c061ec), closes [#1119])
  * allow arrays in both path and query params ([fdd2f2c1](https://github.com/angular-ui/ui-router/commit/fdd2f2c191c4a67c874fdb9ec9a34f8dde9ad180), closes [#1073], [#1045], [#1486], [#1394])
  * typed params in search ([8d4cab69](https://github.com/angular-ui/ui-router/commit/8d4cab69dd67058e1a716892cc37b7d80a57037f), closes [#1488](https://github.com/angular-ui/ui-router/issues/1488))
  * no longer generate unroutable urls ([cb9fd9d8](https://github.com/angular-ui/ui-router/commit/cb9fd9d8943cb26c7223f6990db29c82ae8740f8), closes [#1487](https://github.com/angular-ui/ui-router/issues/1487))
  * handle optional parameter followed by required parameter in url format. ([efc72106](https://github.com/angular-ui/ui-router/commit/efc72106ddcc4774b48ea176a505ef9e95193b41))
  * default to parameter string coersion. ([13a468a7](https://github.com/angular-ui/ui-router/commit/13a468a7d54c2fb0751b94c0c1841d580b71e6dc), closes [#1414](https://github.com/angular-ui/ui-router/issues/1414))
  * concat respects strictMode/caseInsensitive ([dd72e103](https://github.com/angular-ui/ui-router/commit/dd72e103edb342d9cf802816fe127e1bbd68fd5f), closes [#1395])
* **ui-sref:**
  * Allow sref state options to take a scope object ([b5f7b596](https://github.com/angular-ui/ui-router/commit/b5f7b59692ce4933e2d63eb5df3f50a4ba68ccc0))
  * replace raw href modification with attrs. ([08c96782](https://github.com/angular-ui/ui-router/commit/08c96782faf881b0c7ab00afc233ee6729548fa0))
  * nagivate to state when url is "" fix($state.href): generate href for state with  ([656b5aab](https://github.com/angular-ui/ui-router/commit/656b5aab906e5749db9b5a080c6a83b95f50fd91), closes [#1363](https://github.com/angular-ui/ui-router/issues/1363))
  * Check that state is defined in isMatch() ([92aebc75](https://github.com/angular-ui/ui-router/commit/92aebc7520f88babdc6e266536086e07263514c3), closes [#1314](https://github.com/angular-ui/ui-router/issues/1314), [#1332](https://github.com/angular-ui/ui-router/issues/1332))
* **uiView:**
  * allow inteprolated ui-view names ([81f6a19a](https://github.com/angular-ui/ui-router/commit/81f6a19a432dac9198fd33243855bfd3b4fea8c0), closes [#1324](https://github.com/angular-ui/ui-router/issues/1324))
  * Made anim work with angular 1.3 ([c3bb7ad9](https://github.com/angular-ui/ui-router/commit/c3bb7ad903da1e1f3c91019cfd255be8489ff4ef), closes [#1367](https://github.com/angular-ui/ui-router/issues/1367), [#1345](https://github.com/angular-ui/ui-router/issues/1345))
* **urlRouter:** html5Mode accepts an object from angular v1.3.0-rc.3 ([7fea1e9d](https://github.com/angular-ui/ui-router/commit/7fea1e9d0d8c6e09cc6c895ecb93d4221e9adf48))
* **stateFilters:** mark state filters as stateful. ([a00b353e](https://github.com/angular-ui/ui-router/commit/a00b353e3036f64a81245c4e7898646ba218f833), closes [#1479])
* **ui-router:** re-add IE8 compatibility for map/filter/keys ([8ce69d9f](https://github.com/angular-ui/ui-router/commit/8ce69d9f7c886888ab53eca7e53536f36b428aae), closes [#1518], [#1383])
* **package:** point 'main' to a valid filename ([ac903350](https://github.com/angular-ui/ui-router/commit/ac9033501debb63364539d91fbf3a0cba4579f8e))
* **travis:** make CI build faster ([0531de05](https://github.com/angular-ui/ui-router/commit/0531de052e414a8d839fbb4e7635e923e94865b3))


#### Features

##### Default and Typed params

This release includes a lot of bug fixes around default/optional and typed parameters.  As such, 0.2.12 is the first release where we recommend those features be used.

* **$state:**
  * add state params validation ([b1379e6a](https://github.com/angular-ui/ui-router/commit/b1379e6a4d38f7ed7436e05873932d7c279af578), closes [#1433](https://github.com/angular-ui/ui-router/issues/1433))
  * is/includes/get work on relative stateOrName ([232e94b3](https://github.com/angular-ui/ui-router/commit/232e94b3c2ca2c764bb9510046e4b61690c87852))
  * .reload() returns state transition promise ([639e0565](https://github.com/angular-ui/ui-router/commit/639e0565dece9d5544cc93b3eee6e11c99bd7373))
* **$templateFactory:** request templateURL as text/html ([ccd60769](https://github.com/angular-ui/ui-router/commit/ccd6076904a4b801d77b47f6e2de4c06ce9962f8), closes [#1287])
* **$urlMatcherFactory:** Made a Params and ParamSet class ([0cc1e6cc](https://github.com/angular-ui/ui-router/commit/0cc1e6cc461a4640618e2bb594566551c54834e2))



<a name="0.2.11"></a>
### 0.2.11 (2014-08-26)


#### Bug Fixes

* **$resolve:** Resolves only inherit from immediate parent fixes #702 ([df34e20c](https://github.com/angular-ui/ui-router/commit/df34e20c576299e7a3c8bd4ebc68d42341c0ace9))
* **$state:**
  * change $state.href default options.inherit to true ([deea695f](https://github.com/angular-ui/ui-router/commit/deea695f5cacc55de351ab985144fd233c02a769))
  * sanity-check state lookups ([456fd5ae](https://github.com/angular-ui/ui-router/commit/456fd5aec9ea507518927bfabd62b4afad4cf714), closes [#980](https://github.com/angular-ui/ui-router/issues/980))
  * didn't comply to inherit parameter ([09836781](https://github.com/angular-ui/ui-router/commit/09836781f126c1c485b06551eb9cfd4fa0f45c35))
  * allow view content loading broadcast ([7b78edee](https://github.com/angular-ui/ui-router/commit/7b78edeeb52a74abf4d3f00f79534033d5a08d1a))
* **$urlMatcherFactory:**
  * detect injected functions ([91f75ae6](https://github.com/angular-ui/ui-router/commit/91f75ae66c4d129f6f69e53bd547594e9661f5d5))
  * syntax ([1ebed370](https://github.com/angular-ui/ui-router/commit/1ebed37069bae8614d41541d56521f5c45f703f3))
* **UrlMatcher:**
  * query param function defaults ([f9c20530](https://github.com/angular-ui/ui-router/commit/f9c205304f10d8a4ebe7efe9025e642016479a51))
  * don't decode default values ([63607bdb](https://github.com/angular-ui/ui-router/commit/63607bdbbcb432d3fb37856a1cb3da0cd496804e))
* **travis:** update Node version to fix build ([d6b95ef2](https://github.com/angular-ui/ui-router/commit/d6b95ef23d9dacb4eba08897f5190a0bcddb3a48))
* **uiSref:**
  * Generate an href for states with a blank url. closes #1293 ([691745b1](https://github.com/angular-ui/ui-router/commit/691745b12fa05d3700dd28f0c8d25f8a105074ad))
  * should inherit params by default ([b973dad1](https://github.com/angular-ui/ui-router/commit/b973dad155ad09a7975e1476bd096f7b2c758eeb))
  * cancel transition if preventDefault() has been called ([2e6d9167](https://github.com/angular-ui/ui-router/commit/2e6d9167d3afbfbca6427e53e012f94fb5fb8022))
* **uiView:** Fixed infinite loop when is called .go() from a controller. ([e13988b8](https://github.com/angular-ui/ui-router/commit/e13988b8cd6231d75c78876ee9d012cc87f4a8d9), closes [#1194](https://github.com/angular-ui/ui-router/issues/1194))
* **docs:**
  * Fixed link to milestones ([6c0ae500](https://github.com/angular-ui/ui-router/commit/6c0ae500cc238ea9fc95adcc15415c55fc9e1f33))
  * fix bug in decorator example ([4bd00af5](https://github.com/angular-ui/ui-router/commit/4bd00af50b8b88a49d1545a76290731cb8e0feb1))
  * Removed an incorrect semi-colon ([af97cef8](https://github.com/angular-ui/ui-router/commit/af97cef8b967f2e32177e539ef41450dca131a7d))
  * Explain return value of rule as function ([5e887890](https://github.com/angular-ui/ui-router/commit/5e8878900a6ffe59a81aed531a3925e34a297377))


#### Features

* **$state:**
  * allow parameters to pass unharmed ([8939d057](https://github.com/angular-ui/ui-router/commit/8939d0572ab1316e458ef016317ecff53131a822))
    * **BREAKING CHANGE**: state parameters are no longer automatically coerced to strings, and unspecified parameter values are now set to undefined rather than null.
  * allow prevent syncUrl on failure ([753060b9](https://github.com/angular-ui/ui-router/commit/753060b910d5d2da600a6fa0757976e401c33172))
* **typescript:** Add typescript definitions for component builds ([521ceb3f](https://github.com/angular-ui/ui-router/commit/521ceb3fd7850646422f411921e21ce5e7d82e0f))
* **uiSref:** extend syntax for ui-sref ([71cad3d6](https://github.com/angular-ui/ui-router/commit/71cad3d636508b5a9fe004775ad1f1adc0c80c3e))
* **uiSrefActive:** 
  * Also activate for child states. ([bf163ad6](https://github.com/angular-ui/ui-router/commit/bf163ad6ce176ce28792696c8302d7cdf5c05a01), closes [#818](https://github.com/angular-ui/ui-router/issues/818))
    * **BREAKING CHANGE** Since ui-sref-active now activates even when child states are active you may need to swap out your ui-sref-active with ui-sref-active-eq, thought typically we think devs want the auto inheritance.

  * uiSrefActiveEq: new directive with old ui-sref-active behavior
* **$urlRouter:**
  * defer URL change interception ([c72d8ce1](https://github.com/angular-ui/ui-router/commit/c72d8ce11916d0ac22c81b409c9e61d7048554d7))
  * force URLs to have valid params ([d48505cd](https://github.com/angular-ui/ui-router/commit/d48505cd328d83e39d5706e085ba319715f999a6))
  * abstract $location handling ([08b4636b](https://github.com/angular-ui/ui-router/commit/08b4636b294611f08db35f00641eb5211686fb50))
* **$urlMatcherFactory:**
  * fail on bad parameters ([d8f124c1](https://github.com/angular-ui/ui-router/commit/d8f124c10d00c7e5dde88c602d966db261aea221))
  * date type support ([b7f074ff](https://github.com/angular-ui/ui-router/commit/b7f074ff65ca150a3cdbda4d5ad6cb17107300eb))
  * implement type support ([450b1f0e](https://github.com/angular-ui/ui-router/commit/450b1f0e8e03c738174ff967f688b9a6373290f4))
* **UrlMatcher:**
  * handle query string arrays ([9cf764ef](https://github.com/angular-ui/ui-router/commit/9cf764efab45fa9309368688d535ddf6e96d6449), closes [#373](https://github.com/angular-ui/ui-router/issues/373))
  * injectable functions as defaults ([00966ecd](https://github.com/angular-ui/ui-router/commit/00966ecd91fb745846039160cab707bfca8b3bec))
  * default values & type decoding for query params ([a472b301](https://github.com/angular-ui/ui-router/commit/a472b301389fbe84d1c1fa9f24852b492a569d11))
  * allow shorthand definitions ([5b724304](https://github.com/angular-ui/ui-router/commit/5b7243049793505e44b6608ea09878c37c95b1f5))
  * validates whole interface ([32b27db1](https://github.com/angular-ui/ui-router/commit/32b27db173722e9194ef1d5c0ea7d93f25a98d11))
  * implement non-strict matching ([a3e21366](https://github.com/angular-ui/ui-router/commit/a3e21366bee0475c9795a1ec76f70eec41c5b4e3))
  * add per-param config support ([07b3029f](https://github.com/angular-ui/ui-router/commit/07b3029f4d409cf955780113df92e36401b47580))
    * **BREAKING CHANGE**: the `params` option in state configurations must now be an object keyed by parameter name.

### 0.2.10 (2014-03-12)


#### Bug Fixes

* **$state:** use $browser.baseHref() when generating urls with .href() ([cbcc8488](https://github.com/angular-ui/ui-router/commit/cbcc84887d6b6d35258adabb97c714cd9c1e272d))
* **bower.json:** JS files should not be ignored ([ccdab193](https://github.com/angular-ui/ui-router/commit/ccdab193315f304eb3be5f5b97c47a926c79263e))
* **dev:** karma:background task is missing, can't run grunt:dev. ([d9f7b898](https://github.com/angular-ui/ui-router/commit/d9f7b898e8e3abb8c846b0faa16a382913d7b22b))
* **sample:** Contacts menu button not staying active when navigating to detail states. Need t ([2fcb8443](https://github.com/angular-ui/ui-router/commit/2fcb84437cb43ade12682a92b764f13cac77dfe7))
* **uiSref:** support mock-clicks/events with no data ([717d3ff7](https://github.com/angular-ui/ui-router/commit/717d3ff7d0ba72d239892dee562b401cdf90e418))
* **uiView:**
  * Do NOT autoscroll when autoscroll attr is missing ([affe5bd7](https://github.com/angular-ui/ui-router/commit/affe5bd785cdc3f02b7a9f64a52e3900386ec3a0), closes [#807](https://github.com/angular-ui/ui-router/issues/807))
  * Refactoring uiView directive to copy ngView logic ([548fab6a](https://github.com/angular-ui/ui-router/commit/548fab6ab9debc9904c5865c8bc68b4fc3271dd0), closes [#857](https://github.com/angular-ui/ui-router/issues/857), [#552](https://github.com/angular-ui/ui-router/issues/552))


#### Features

* **$state:** includes() allows glob patterns for state matching. ([2d5f6b37](https://github.com/angular-ui/ui-router/commit/2d5f6b37191a3135f4a6d9e8f344c54edcdc065b))
* **UrlMatcher:** Add support for case insensitive url matching ([642d5247](https://github.com/angular-ui/ui-router/commit/642d524799f604811e680331002feec7199a1fb5))
* **uiSref:** add support for transition options ([2ed7a728](https://github.com/angular-ui/ui-router/commit/2ed7a728cee6854b38501fbc1df6139d3de5b28a))
* **uiView:** add controllerAs config with function ([1ee7334a](https://github.com/angular-ui/ui-router/commit/1ee7334a73efeccc9b95340e315cdfd59944762d))


### 0.2.9 (2014-01-17)


This release is identical to 0.2.8. 0.2.8 was re-tagged in git to fix a problem with bower.


### 0.2.8 (2014-01-16)


#### Bug Fixes

* **$state:** allow null to be passed as 'params' param ([094dc30e](https://github.com/angular-ui/ui-router/commit/094dc30e883e1bd14e50a475553bafeaade3b178))
* **$state.go:** param inheritance shouldn't inherit from siblings ([aea872e0](https://github.com/angular-ui/ui-router/commit/aea872e0b983cb433436ce5875df10c838fccedb))
* **bower.json:** fixes bower.json ([eed3cc4d](https://github.com/angular-ui/ui-router/commit/eed3cc4d4dfef1d3ef84b9fd063127538ebf59d3))
* **uiSrefActive:** annotate controller injection ([85921422](https://github.com/angular-ui/ui-router/commit/85921422ff7fb0effed358136426d616cce3d583), closes [#671](https://github.com/angular-ui/ui-router/issues/671))
* **uiView:**
  * autoscroll tests pass on 1.2.4 & 1.1.5 ([86eacac0](https://github.com/angular-ui/ui-router/commit/86eacac09ca5e9000bd3b9c7ba6e2cc95d883a3a))
  * don't animate initial load ([83b6634d](https://github.com/angular-ui/ui-router/commit/83b6634d27942ca74766b2b1244a7fc52c5643d9))
  * test pass against 1.0.8 and 1.2.4 ([a402415a](https://github.com/angular-ui/ui-router/commit/a402415a2a28b360c43b9fe8f4f54c540f6c33de))
  * it should autoscroll when expr is missing. ([8bb9e27a](https://github.com/angular-ui/ui-router/commit/8bb9e27a2986725f45daf44c4c9f846385095aff))


#### Features

* **uiSref:** add target attribute behaviour ([c12bf9a5](https://github.com/angular-ui/ui-router/commit/c12bf9a520d30d70294e3d82de7661900f8e394e))
* **uiView:**
  * merge autoscroll expression test. ([b89e0f87](https://github.com/angular-ui/ui-router/commit/b89e0f871d5cc35c10925ede986c10684d5c9252))
  * cache and test autoscroll expression ([ee262282](https://github.com/angular-ui/ui-router/commit/ee2622828c2ce83807f006a459ac4e11406d9258))
