<a name="v0.5.1"></a>
### v0.5.1 (2014-03-05)


#### Features

* **collision:** overlapping region as a config option ([720d487e](http://github.com/ducksboard/gridster.js/commit/720d487e3988593e2c60909c88aaff13fbd4f842))
* **coords:**
  * allow both (left/x1) and (top/y1) attr keys ([6f22217f](http://github.com/ducksboard/gridster.js/commit/6f22217f056e4fc52f6405f2af49596105aae150))
  * add destroy method ([fdeee4f6](http://github.com/ducksboard/gridster.js/commit/fdeee4f636266c7a0579ced833f04fec013b6863))
* **draggable:** keep container position prop if different than static ([04868a38](http://github.com/ducksboard/gridster.js/commit/04868a384d655d110f2d153d2fddb94b1c6d54a9))
* **gridster:** destroy element's data and optionally remove from DOM ([dc09f191](http://github.com/ducksboard/gridster.js/commit/dc09f191d8503669cfa4737122c77cb0f5b9c3d2))

<a name="v0.5.0"></a>
## v0.5.0 (2014-02-14)


#### Bug Fixes

* **autogrow:** refining autogrow_cols behavior and grid width issues ([835c2df8](http://github.com/ducksboard/gridster.js/commit/835c2df84419a92b1641b687fcf083f3ff102627))
* **resize.stop:** Call resize.stop at the latest possible moment ([e21f63a0](http://github.com/ducksboard/gridster.js/commit/e21f63a05a539f5c611eb49cd6861b1e38b36531))


#### Features

* **draggable:** Add toggle draggable method. ([073fdc40](http://github.com/ducksboard/gridster.js/commit/073fdc40e0a94dd371646fc54cd420e3ddab0254))

<a name="v0.4.4"></a>
### v0.4.4 (2014-02-13)


#### Features

* **resize:** add start/stop/resize event triggers ([7ca8deec](http://github.com/ducksboard/gridster.js/commit/7ca8deec8559d950097a6dc351cb0c6fcef3458d))

<a name="v0.4.3"></a>
### v0.4.3 (2014-02-11)


#### Bug Fixes

* **generated-styles:** cleaning cached serializations properly ([f8b04f29](http://github.com/ducksboard/gridster.js/commit/f8b04f298e12e46ca9b07f0bae0abc6b08ed6e18))

<a name="v0.4.2"></a>
### v0.4.2 (2014-02-07)


#### Bug Fixes

* recalculate grid width when adding widgets ([47745978](http://github.com/ducksboard/gridster.js/commit/4774597834300601fc81d5111a31a8c1672c55e1))

<a name="v0.4.1"></a>
### v0.4.1 (2014-02-07)

#### Bug Fixes

* add resize.min_size option to default config object ([5672edb0](http://github.com/ducksboard/gridster.js/commit/5672edb05e39c6b9ff5e3ca31d68c9e94dfaa617))

<a name="v0.4.0"></a>
## v0.4.0 (2014-02-07)


#### Bug Fixes

* **gridster:**
  * leaking options with multiple Gridster instances ([07c71097](http://github.com/ducksboard/gridster.js/commit/07c7109771094d98be51d68448a20e1d2987b35d))
  * resize.axes default option only 'both' ([62988780](http://github.com/ducksboard/gridster.js/commit/6298878077d5db129daa9780939fec5237b82af9))
* **licenses:** add required copyright message for underscore ([b563c094](http://github.com/ducksboard/gridster.js/commit/b563c094cf0f3a5da2288492f95759ae32e8967c))
* **readme:** link title jsfiddle -> jsbin, edit 5) of process steps ([0641aa89](http://github.com/ducksboard/gridster.js/commit/0641aa89833ecf9d167f7d8e89ee8bd5b4304248))


#### Features

* **draggable:**
  * method to set drag limits dynamically ([d4482ec1](http://github.com/ducksboard/gridster.js/commit/d4482ec1476f8a0b6fb6cdeb25b7774ef678d81c))
  * support horizontal scrolling while dragging ([ae4921b7](http://github.com/ducksboard/gridster.js/commit/ae4921b70798944211267cacf8a89e62d0818369))
* **gridster:** increase grid width when dragging or resizing ([37c4e943](http://github.com/ducksboard/gridster.js/commit/37c4e94358b9392710452b9e7f96454837bf9845))
* **resize:** add option to set min_size of a widget ([ff511872](http://github.com/ducksboard/gridster.js/commit/ff511872e65992ee89bd2a88d862caaf99733f38))

<a name="v0.3.0"></a>
## v0.3.0 (2013-11-18)


#### Features

* **draggable:**
  * method to set drag limits dynamically ([d4482ec1](http://github.com/ducksboard/gridster.js/commit/d4482ec1476f8a0b6fb6cdeb25b7774ef678d81c))
  * support horizontal scrolling while dragging ([ae4921b7](http://github.com/ducksboard/gridster.js/commit/ae4921b70798944211267cacf8a89e62d0818369))
* **gridster:** increase grid width when dragging or resizing ([b61df653](http://github.com/ducksboard/gridster.js/commit/b61df6535f728970fb8c6f25a208275dbde66550))

<a name="v0.2.1"></a>
### v0.2.1 (2013-10-28)


#### Features

* **resize:** Add start/stop/resize callbacks ([d4ec7140](http://github.com/ducksboard/gridster.js/commit/d4ec7140f736bc30697c75b54ed3242ddf1d75b9))

<a name="v0.2.0"></a>
## v0.2.0 (2013-10-26)


#### Bug Fixes

* fixes and improvements in widget-resizing. ([ae02b32b](http://github.com/ducksboard/gridster.js/commit/ae02b32b9210c6328f4acc339e215ae50c134f77), closes [#32](http://github.com/ducksboard/gridster.js/issues/32))
* **gridster:**
  * the preview holder should not always use `li` ([1ade74e2](http://github.com/ducksboard/gridster.js/commit/1ade74e239485b07e870fca44e1eafb3ff1ae283))
  * overlapping widget problem ([31fd8d6b](http://github.com/ducksboard/gridster.js/commit/31fd8d6ba893e4c39b91ba30d429e37f3da30b24))
  * Orphan preview holder when dragging is interrupted ([1b13617d](http://github.com/ducksboard/gridster.js/commit/1b13617df2ce53235bdf3a1e38f1555f529663c3))
  * remove_widget Returns the instance of the Gridster Class ([5bfbc5c0](http://github.com/ducksboard/gridster.js/commit/5bfbc5c0b5ab49c2a7c651327ce2e0f30f594985))


#### Features

* **draggable:**
  * new config option to move or not the dragged element ([4d9b2a84](http://github.com/ducksboard/gridster.js/commit/4d9b2a84f11cb7cb2ddad51c158d92b82e7bc447))
  * CSS selectors support in `ignore_dragging` config opt ([0f956249](http://github.com/ducksboard/gridster.js/commit/0f95624925be97aee7a8450707e04e887e4dac58))
  * pass previous position to the drag callback ([055cc0e4](http://github.com/ducksboard/gridster.js/commit/055cc0e4f6f9de5721986515656ac894855f9e02))
  * Don't start new drag if previous one hasn't stopped ([91ca6572](http://github.com/ducksboard/gridster.js/commit/91ca65721c2eb32b5dec82cdc5e5e7f81dac329e))
  * pass useful data to all drag callbacks ([8dda2410](http://github.com/ducksboard/gridster.js/commit/8dda2410f300592706985c05141ca6b702977dc0))
* **gridster:** drag-and-drop widget resizing ([e1924053](http://github.com/ducksboard/gridster.js/commit/e19240532de0bad35ffe6e5fc63934819390adc5))
* **utils:** add delay helper to utils ([faa6c5db](http://github.com/ducksboard/gridster.js/commit/faa6c5db0002feccf681e9f919ed583eef152773))

