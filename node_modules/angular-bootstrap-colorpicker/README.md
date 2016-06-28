[![devDependency Status](https://david-dm.org/buberdds/angular-bootstrap-colorpicker/dev-status.svg?branch=master)](https://david-dm.org/buberdds/angular-bootstrap-colorpicker#info=devDependencies)
[![Build Status](https://travis-ci.org/buberdds/angular-bootstrap-colorpicker.svg?branch=master)](https://travis-ci.org/buberdds/angular-bootstrap-colorpicker)

angular-bootstrap-colorpicker
=============================

This version contains a native AngularJS directive based on bootstrap-colorpicker jQuery library.<br />
No dependency on jQuery or jQuery plugin is required.<br />

<a href="http://codepen.io/buberdds/full/fBAsr/" target="_blank">Demo page (Bootstrap v3.x.x)</a>

Previous releases:
  - <a href="https://github.com/buberdds/angular-bootstrap-colorpicker/tree/2.0">branch 2.0</a> (Bootstrap v2.x.x)
  - <a href="https://github.com/buberdds/angular-bootstrap-colorpicker/tree/1.0.0">branch 1.0</a> if you need a functionality from the original plugin or IE&lt;9 support

Installation
===============================
Copy `css/colorpicker.css` and `js/bootstrap-colorpicker-module.js`.
Add a dependency to your app, for instance:

    angular.module('myApp', ['colorpicker.module'])

Examples:
===============================

Hex format
```html
<input colorpicker type="text" ng-model="your_model" />
```
or
```html
<input colorpicker="hex" type="text" ng-model="your_model" />
```

RGB format
```html
<input colorpicker="rgb" type="text" ng-model="your_model" />
```

RBGA format
```html
<input colorpicker="rgba" type="text" ng-model="your_model" />
```

As non input element
```html
<div colorpicker ng-model="your_model"></div>
```

The color picker template with an input element
```html
<input colorpicker colorpicker-with-input="true" type="text" ng-model="your_model" />
```

Position of the color picker (top, right, bottom, left).
```html
<input colorpicker colorpicker-position="right" type="text" ng-model="your_model" />
```

The color picker in a fixed element
```html
<input colorpicker colorpicker-fixed-position="true" type="text" ng-model="your_model" />
```

When using fixed positioning, you can also put the picker into the parent element (this allows more styling control)
```html
<input colorpicker colorpicker-fixed-position="true" colorpicker-parent="true" type="text" ng-model="your_model" />
```

The color picker in UI Bootstrap modal (the parent element position property must be set to relative)
```html
<input colorpicker colorpicker-parent="true" type="text" ng-model="your_model" />
```

Binding the visibility of the color picker to a variable in the scope
```html
<input colorpicker colorpicker-is-open="isOpen" type="text" ng-model="your_model" />
```

Auto hiding the color picker when a color has been selected
```html
<input colorpicker colorpicker-close-on-select type="text" ng-model="your_model" />
```

Events:
===============================

Each color picker will emit the following events passing a data object in the following format:
```javascript
{
	name: '',
	value: ''
}
```
Name is the string representation of ng-model and value is the current color.

#### colorpicker-selected
A global selected event, will be fired when a color is selected from the saturation, hue or alpha slider.

#### colorpicker-selected-saturation
Will be fired when a color is selected from the saturation slider.

#### colorpicker-selected-hue
Will be fired when a color is selected from the hue slider.

#### colorpicker-selected-alpha
Will be fired when a color is selected from the alpha slider.

#### colorpicker-shown
Will be fired when a color picker is opened.

#### colorpicker-closed
Will be fired when a color picker is closed.