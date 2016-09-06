Version 0.0.13 - 2015/01/13
================

  * bug fixes

Version 0.0.12 - 2014/12/09
================

  * bug fixes

Version 0.0.11 - 2014/11/28
================

  * touch support

Version 0.0.9 - 2014/09/11
================

  * fixed a bug where `$digest` hasn't been called after `sv-on-start` handler
  * added a `sv-on-stop` optional attribute. Function bound there will be called when dragging ended regardless of the fact whether elements have been reordered or not

Version 0.0.8 - 2014/07/15
================

  * fixed a bug where nothing within an element without handle could have been clicked


Version 0.0.7 - 2014/07/02
================

You can now use these optional attributes on the element with `sv-root`:
  * `sv-on-sort` - The expression passed as a value of that attribute will be evaluated when elements order has changed after sorting. Several parameters can be injected there like: `sv-on-sort="foo($item, $partFrom, $partTo, $indexFrom, $indexTo)"` where:
				<ul>
					<li>`$item` is the item in model which has been moved</li>
					<li>`$partFrom` is the part from which the $item originated</li>
					<li>`$partTo` is the part to which the $item has been moved</li>
					<li>`$indexFrom` is the previous index of the $item in $partFrom</li>
					<li>`$indedTo` is the index of the $item in $partTo</li>
				</ul>
			</li>
  * `sv-on-start` - The expression passed as a value of that attribute will be evaluated when a user starts moving an element. Several parameters can be injected there like: `sv-on-start="bar($item, $part, $index, $helper)"` where:
				<ul>
					<li>`$item` is the item in model which started being moved</li>
					<li>`$part` is the part from which the $item originates</li>
					<li>`$index` is the index of the $item in $part</li>
					<li>`$helper` is the jqLite/jQuery object of an element that is being dragged around</li>
				</ul>
			</li>

Version 0.0.6 - 2014/07/01
================

  * You can now listen for resorting. An `sv-on-sort` attribute can be now placed on an element with `sv-root`. The expression passed as a value of that attribute will be evaluated when elements order has changed after sorting.

Version 0.0.5 - 2014/06/26
================

  * source element for sorting is now detached from DOM instead of giving him `display: none`

Version 0.0.4 - 2014/06/25
================

  * Fixed the issue with helper styles
  * Dropped the need for the browser to support pointer-events CSS property
  * Added the project to the bower registy, it is available to download via `bower install angular-sortable-view`

Version 0.0.3 - 2014/06/11
================

  * Added support for custom placeholders
  * Better containment handling
  * Bug fixes
  * BREAKING CHANGE: the module name is now `angular-sortable-view`

Version 0.0.2 - 2014/06/11
================

  * Added support for empty lists
  * Added support for custom helpers

Version 0.0.1
================

  * Support for setting a containment
  * Support for multiple sortable lists connected with each other
  * Support for specifying a handle element
