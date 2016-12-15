angular-sortable-view v0.0.13 [![Bower version](https://badge.fury.io/bo/angular-sortable-view.svg)](http://badge.fury.io/bo/angular-sortable-view)
=================

Fully declarative (multi)sortable for AngularJS

Demo: http://kamilkp.github.io/angular-sortable-view/

You can find the source code for this demo on branch "gh-pages".

Also see the changelog [here](https://github.com/kamilkp/angular-sortable-view/blob/master/CHANGELOG.md)

###DESCRIPTION:

This is a simple library written as a module for [AngularJS](https://github.com/angular/angular.js) for sorting elements in the UI. It supports both single elements list, and multiple connected lists, where an element can be moved from one to another.

This library requires ***no dependencies whatsoever*** (except angular.js of course), so ***you no longer need to include jQuery and jQueryUI and angularUI*** which altogether gives the size of around ***340kB minified***. Whereas the [angular-sortable-view](https://github.com/kamilkp/angular-sortable-view) is only ***5kB minified!***.

###API:

The API is declarative. There are four directives (hooked on attributes) that need to be nested properly:

  * `sv-root` - this is where all the logic is happening. If multiple lists should be connected with each other so that elements can be moved between them and they have a common ancestor, put this attribute on that element. If not and you still want the multi-sortable behaviour a value for that attribue must be provided. That value will be used as an identifier to connect those roots together.
    **Optional attributes:**
    * `sv-on-sort` - The expression passed as a value of that attribute will be evaluated when elements order has changed after sorting. Several parameters can be injected there like: `sv-on-sort="foo($item, $partFrom, $partTo, $indexFrom, $indexTo)"` where:
				<ul>
					<li>`$item` is the item in model which has been moved</li>
					<li>`$partFrom` is the part from which the $item originated</li>
					<li>`$partTo` is the part to which the $item has been moved</li>
					<li>`$indexFrom` is the previous index of the $item in $partFrom</li>
					<li>`$indexTo` is the index of the $item in $partTo</li>
				</ul>
			</li>
			<li>`sv-on-start` - The expression passed as a value of that attribute will be evaluated when a user starts moving an element. Several parameters can be injected there like: `sv-on-start="bar($item, $part, $index, $helper)"` where:
				<ul>
					<li>`$item` is the item in model which started being moved</li>
					<li>`$part` is the part from which the $item originates</li>
					<li>`$index` is the index of the $item in $part</li>
					<li>`$helper` is the jqLite/jQuery object of an element that is being dragged around</li>
				</ul>
			</li>
			<li>`sv-on-stop` - The expression passed as a value of that attribute will be evaluated when a user stops moving an element (drops it). This will be called regardless of the fact whether elements have been reordered or now. Several parameters can be injected there like: `sv-on-end="baz($item, $part, $index)"` where:
				<ul>
					<li>`$item` is the item in model which started being moved</li>
					<li>`$part` is the part from which the $item originates</li>
					<li>`$index` is the index of the $item in $part</li>
				</ul>
			</li>
  * `sv-part` - this attribute should be placed on an element that is a container for the `ngRepeat`'ed elements. Its value should be the same as the right hand side expression in `ng-repeat` attribute.
  * `sv-element` - this attribute should be placed on the same element as `ng-repeat` attribute. Its (optional) value should be an expression that evaluates to the options object.
  * `sv-handle` - this attribute is optional. If needed it can be placed on an element within the sortable element. This element will be the handle for sorting operations.
  * `sv-helper` - the element with this attribute will serve as a custom helper for sorting operations
  * `sv-placeholder` - the element with this attribute will serve as a custom placeholder for sorting operations

###Example of single sortable list

```html
<div sv-root sv-part="modelArray">
	<div ng-repeat="item in modelArray" sv-element>
		<div>{{item}}</div>
	</div>
</div>
```

###Example of multiple sortable lists with common ancestor

```html
<div sv-root>
	<div sv-part="modelArray1">
		<div ng-repeat="item in modelArray1" sv-element>
			<div>{{item}}</div>
		</div>
	</div>
	<div sv-part="modelArray2">
		<div ng-repeat="item in modelArray2" sv-element>
			<div>{{item}}</div>
		</div>
	</div>
</div>
```

###Example of multiple sortable lists without common ancestor

```html
<div>
	<div sv-root="someUniqueId" sv-part="modelArray1">
		<div ng-repeat="item in modelArray1" sv-element>
			<div>{{item}}</div>
		</div>
	</div>
	<div sv-root="someUniqueId" sv-part="modelArray2">
		<div ng-repeat="item in modelArray2" sv-element>
			<div>{{item}}</div>
		</div>
	</div>
</div>
```

###Example of using handles

```html
<div sv-root sv-part="modelArray">
	<div ng-repeat="item in modelArray" sv-element>
		<div>{{item}}</div>
		<span sv-handle>`
	</div>
</div>
```

###Example of using custom helpers per part

```html
<div sv-root sv-part="modelArray">
	<div sv-helper>
		custom helper
	</div>
	<div ng-repeat="item in modelArray" sv-element>
		{{item}}
	</div>
</div>
```

###Example of using custom helpers per element

```html
<div sv-root sv-part="modelArray">
	<div ng-repeat="item in modelArray" sv-element>
		<div sv-helper>
			custom helper {{item}}
		</div>
		{{item}}
	</div>
</div>
```

###Example of using custom placeholders per part

```html
<div sv-root sv-part="modelArray">
	<div sv-placeholder>
		custom placeholder
	</div>
	<div ng-repeat="item in modelArray" sv-element>
		{{item}}
	</div>
</div>
```

###Example of using custom placeholders per element

```html
<div sv-root sv-part="modelArray">
	<div ng-repeat="item in modelArray" sv-element>
		<div sv-placeholder>
			custom placeholder {{item}}
		</div>
		{{item}}
	</div>
</div>
```
